/**
 * End-to-end per-candidate pipeline — AID §3 / DEV §11.3.
 * Claim → Parse → Prompt → Gemini → Validate → Persist
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { extractResumeText } from "./parse/index.ts";
import { buildPrompt } from "./prompt/index.ts";
import { callGemini, sleep, backoffMs } from "./gemini/index.ts";
import { validateAiResponse } from "./validate/index.ts";
import {
  persistFailedAi,
  persistFailedParse,
  persistSuccess,
} from "./persist/index.ts";
import type { WorkerConfig } from "./config.ts";

const RESUMES_BUCKET = "resumes";

function toResumeObjectKey(storagePathOrKey: string): string {
  const trimmed = storagePathOrKey.replace(/^\/+/, "");
  if (trimmed.startsWith(`${RESUMES_BUCKET}/`)) {
    return trimmed.slice(RESUMES_BUCKET.length + 1);
  }
  return trimmed;
}
export type QueueRow = {
  id: string;
  candidate_id: string;
  job_id: string;
  queue_status: string;
  attempt_count: number;
  lock_owner: string | null;
};

export async function processQueueItem(
  admin: SupabaseClient,
  row: QueueRow,
  config: WorkerConfig,
): Promise<{ outcome: "completed" | "failed_parse" | "failed_ai" | "skipped" }> {
  const timings = { extract: 0, gemini: 0, validate: 0, persist: 0 };

  // Idempotent: already completed → close queue
  const { data: candidate } = await admin
    .from("candidates")
    .select("id, job_id, status, original_filename")
    .eq("id", row.candidate_id)
    .maybeSingle();

  if (!candidate) {
    await admin
      .from("processing_queue")
      .update({
        queue_status: "dead",
        last_error: "candidate_missing",
        locked_at: null,
        lock_owner: null,
      })
      .eq("id", row.id);
    return { outcome: "skipped" };
  }

  if (candidate.status === "completed") {
    await admin
      .from("processing_queue")
      .update({
        queue_status: "done",
        locked_at: null,
        lock_owner: null,
        last_error: null,
      })
      .eq("id", row.id);
    return { outcome: "skipped" };
  }

  // Ownership re-check (SEC §5.4)
  const { data: job } = await admin
    .from("jobs")
    .select("id, owner_user_id, title, jd_text, lifecycle_status")
    .eq("id", row.job_id)
    .maybeSingle();

  if (!job || job.lifecycle_status !== "active" || !job.jd_text?.trim()) {
    await persistFailedAi({
      admin,
      candidate_id: row.candidate_id,
      job_id: row.job_id,
      queue_id: row.id,
      failure_message: "Job is not available for screening.",
      attempt: row.attempt_count,
    });
    return { outcome: "failed_ai" };
  }

  // parsing
  await admin
    .from("candidates")
    .update({ status: "parsing", failure_code: null, failure_message: null })
    .eq("id", row.candidate_id);

  const { data: fileRow } = await admin
    .from("resume_files")
    .select("storage_path, mime_type")
    .eq("candidate_id", row.candidate_id)
    .maybeSingle();

  if (!fileRow) {
    await persistFailedParse({
      admin,
      candidate_id: row.candidate_id,
      job_id: row.job_id,
      queue_id: row.id,
      failure_message: "Resume file not found for this candidate.",
    });
    return { outcome: "failed_parse" };
  }

  const objectKey = toResumeObjectKey(fileRow.storage_path);
  const extractStarted = Date.now();
  const { data: blob, error: downloadError } = await admin.storage
    .from(RESUMES_BUCKET)
    .download(objectKey);
  timings.extract = Date.now() - extractStarted;

  if (downloadError || !blob) {
    await persistFailedParse({
      admin,
      candidate_id: row.candidate_id,
      job_id: row.job_id,
      queue_id: row.id,
      failure_message: "Could not download resume for parsing.",
    });
    return { outcome: "failed_parse" };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const parsed = await extractResumeText(bytes, fileRow.mime_type);
  timings.extract = Date.now() - extractStarted;

  if (!parsed.ok) {
    await persistFailedParse({
      admin,
      candidate_id: row.candidate_id,
      job_id: row.job_id,
      queue_id: row.id,
      failure_message: parsed.failure_message,
    });
    return { outcome: "failed_parse" };
  }

  await admin
    .from("candidates")
    .update({ status: "parsed" })
    .eq("id", row.candidate_id);

  await admin
    .from("candidates")
    .update({ status: "ai_processing" })
    .eq("id", row.candidate_id);

  // Extend lock before Gemini
  await admin.rpc("extend_processing_queue_lock", {
    p_queue_id: row.id,
    p_lock_owner: row.lock_owner ?? "worker",
    p_visibility_ms: config.queueVisibilityMs,
  });

  const maxAttempts = config.aiMaxTransientRetries + 1;
  let lastError = "AI screening failed for this candidate.";
  let repair = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prompt = buildPrompt({
      job_id: row.job_id,
      candidate_id: row.candidate_id,
      job_title: job.title,
      jd_text: job.jd_text,
      resume_text: parsed.text,
      repair,
    });

    if (!prompt.ok) {
      await persistFailedParse({
        admin,
        candidate_id: row.candidate_id,
        job_id: row.job_id,
        queue_id: row.id,
        failure_message: prompt.failure_message,
      });
      return { outcome: "failed_parse" };
    }

    const geminiStarted = Date.now();
    const gemini = await callGemini(prompt.messages, {
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      timeoutMs: config.aiCallTimeoutMs,
    });
    timings.gemini += Date.now() - geminiStarted;

    if (!gemini.ok) {
      lastError = "AI screening failed for this candidate.";
      if (!gemini.retryable || attempt >= maxAttempts - 1) {
        break;
      }
      await sleep(backoffMs(attempt));
      continue;
    }

    const validateStarted = Date.now();
    const validated = validateAiResponse(gemini.text);
    timings.validate += Date.now() - validateStarted;

    if (!validated.ok) {
      lastError = "AI screening failed for this candidate.";
      console.error("ai_validation_failed", {
        candidate_id: row.candidate_id,
        reason: validated.reason,
        attempt,
      });
      if (attempt >= maxAttempts - 1) break;
      // Final attempt uses repair note
      if (attempt === maxAttempts - 2) repair = true;
      await sleep(backoffMs(attempt));
      continue;
    }

    const persistStarted = Date.now();
    try {
      await persistSuccess({
        admin,
        candidate_id: row.candidate_id,
        job_id: row.job_id,
        queue_id: row.id,
        payload: validated.payload,
        model: gemini.model,
        timings_ms: {
          ...timings,
          persist: 0,
        },
        input_truncated: prompt.messages.input_truncated,
        repair_attempt: repair,
        extra_warnings: [
          ...prompt.messages.warnings,
          ...validated.warnings,
        ],
      });
      timings.persist = Date.now() - persistStarted;
      // Update metadata timings with final persist — best-effort patch
      await admin
        .from("evaluations")
        .update({
          model_metadata: {
            model: gemini.model,
            prompt_version: validated.payload.validation_metadata.prompt_version,
            schema_version: validated.payload.schema_version,
            timings_ms: timings,
            input_truncated: prompt.messages.input_truncated,
            ...(repair ? { repair_attempt: true } : {}),
            explainability: {
              reasons: validated.payload.evaluation.reasons,
              warnings: [
                ...validated.payload.evaluation.warnings,
                ...prompt.messages.warnings,
                ...validated.warnings,
              ],
              dimension_hints: validated.payload.evaluation.dimension_hints,
            },
          },
        })
        .eq("candidate_id", row.candidate_id);

      return { outcome: "completed" };
    } catch (err) {
      lastError = "AI screening failed for this candidate.";
      console.error("ai_persist_failed", {
        candidate_id: row.candidate_id,
        message: err instanceof Error ? err.message.slice(0, 120) : "persist",
      });
      if (attempt >= maxAttempts - 1) break;
      await sleep(backoffMs(attempt));
    }
  }

  await persistFailedAi({
    admin,
    candidate_id: row.candidate_id,
    job_id: row.job_id,
    queue_id: row.id,
    failure_message: lastError,
    attempt: row.attempt_count,
  });
  return { outcome: "failed_ai" };
}
