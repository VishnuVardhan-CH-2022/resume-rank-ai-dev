/**
 * Persist validated AI results — AID §8.3 / CP-22 / BR-12.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  PROMPT_VERSION,
  SCHEMA_VERSION,
  type CanonicalAiResponse,
  type ModelMetadata,
} from "../types.ts";

export type PersistSuccessInput = {
  admin: SupabaseClient;
  candidate_id: string;
  job_id: string;
  queue_id: string;
  payload: CanonicalAiResponse;
  model: string;
  timings_ms: ModelMetadata["timings_ms"];
  input_truncated: boolean;
  repair_attempt?: boolean;
  extra_warnings?: string[];
};

export async function persistSuccess(input: PersistSuccessInput): Promise<void> {
  const { admin, candidate_id, job_id, queue_id, payload } = input;
  const profile = payload.candidate_profile;
  const evaluation = payload.evaluation;

  const warnings = [
    ...evaluation.warnings,
    ...(input.extra_warnings ?? []),
  ];

  const model_metadata: ModelMetadata = {
    model: input.model,
    prompt_version: PROMPT_VERSION,
    schema_version: SCHEMA_VERSION,
    timings_ms: input.timings_ms,
    input_truncated: input.input_truncated,
    ...(input.repair_attempt ? { repair_attempt: true } : {}),
    explainability: {
      reasons: evaluation.reasons,
      warnings,
      dimension_hints: evaluation.dimension_hints,
    },
  };

  // BR-12: snapshot prior active evaluation before overwrite
  const { data: prior } = await admin
    .from("evaluations")
    .select(
      "candidate_id, job_id, match_score, rationale, summary, model_metadata, evaluated_at",
    )
    .eq("candidate_id", candidate_id)
    .maybeSingle();

  if (prior) {
    const { error: histError } = await admin.from("evaluation_history").insert({
      candidate_id: prior.candidate_id,
      job_id: prior.job_id,
      match_score: prior.match_score,
      rationale: prior.rationale,
      summary: prior.summary,
      model_metadata: prior.model_metadata,
      evaluated_at: prior.evaluated_at,
    });
    if (histError) {
      throw new Error(`evaluation_history insert failed: ${histError.message}`);
    }
  }

  const { error: profileError } = await admin.from("candidate_profiles").upsert(
    {
      candidate_id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      skills: profile.skills,
      education: profile.education,
      experience: profile.experience,
      certifications: profile.certifications,
      projects: profile.projects,
      resume_summary: profile.resume_summary,
      linkedin: profile.linkedin,
      github: profile.github,
      portfolio: profile.portfolio,
      languages: profile.languages,
      location: profile.location,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "candidate_id" },
  );
  if (profileError) {
    throw new Error(`candidate_profiles upsert failed: ${profileError.message}`);
  }

  const { error: evalError } = await admin.from("evaluations").upsert(
    {
      candidate_id,
      job_id,
      match_score: evaluation.match_score,
      rationale: evaluation.rationale,
      summary: evaluation.summary,
      model_metadata,
      evaluated_at: new Date().toISOString(),
    },
    { onConflict: "candidate_id" },
  );
  if (evalError) {
    throw new Error(`evaluations upsert failed: ${evalError.message}`);
  }

  const { error: statusError } = await admin
    .from("candidates")
    .update({
      status: "completed",
      failure_code: null,
      failure_message: null,
    })
    .eq("id", candidate_id);
  if (statusError) {
    throw new Error(`candidate completed update failed: ${statusError.message}`);
  }

  const { error: queueError } = await admin
    .from("processing_queue")
    .update({
      queue_status: "done",
      locked_at: null,
      lock_owner: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", queue_id);
  if (queueError) {
    throw new Error(`queue done update failed: ${queueError.message}`);
  }

  await admin.from("audit_logs").insert({
    job_id,
    candidate_id,
    event_type: "ai.completed",
    payload: {
      prompt_version: PROMPT_VERSION,
      schema_version: SCHEMA_VERSION,
      model: input.model,
    },
  });
}

export async function persistFailedParse(input: {
  admin: SupabaseClient;
  candidate_id: string;
  job_id: string;
  queue_id: string;
  failure_message: string;
}): Promise<void> {
  const { admin } = input;
  await admin
    .from("candidates")
    .update({
      status: "failed_parse",
      failure_code: "EH-PARSE",
      failure_message: input.failure_message.slice(0, 280),
    })
    .eq("id", input.candidate_id);

  await admin
    .from("processing_queue")
    .update({
      queue_status: "done",
      locked_at: null,
      lock_owner: null,
      last_error: "EH-PARSE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.queue_id);

  await admin.from("audit_logs").insert({
    job_id: input.job_id,
    candidate_id: input.candidate_id,
    event_type: "ai.failed_parse",
    payload: { failure_code: "EH-PARSE" },
  });
}

export async function persistFailedAi(input: {
  admin: SupabaseClient;
  candidate_id: string;
  job_id: string;
  queue_id: string;
  failure_message: string;
  attempt: number;
}): Promise<void> {
  const { admin } = input;
  // DD-08: do not fabricate evaluation; retain prior active row if any.
  await admin
    .from("candidates")
    .update({
      status: "failed_ai",
      failure_code: "EH-AI",
      failure_message: input.failure_message.slice(0, 280),
    })
    .eq("id", input.candidate_id);

  await admin
    .from("processing_queue")
    .update({
      queue_status: "done",
      locked_at: null,
      lock_owner: null,
      last_error: "EH-AI",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.queue_id);

  await admin.from("audit_logs").insert({
    job_id: input.job_id,
    candidate_id: input.candidate_id,
    event_type: "ai.failed",
    payload: {
      failure_code: "EH-AI",
      attempt: input.attempt,
      prompt_version: PROMPT_VERSION,
    },
  });
}

export async function markQueueDead(
  admin: SupabaseClient,
  queueId: string,
  lastError: string,
): Promise<void> {
  await admin
    .from("processing_queue")
    .update({
      queue_status: "dead",
      locked_at: null,
      lock_owner: null,
      last_error: lastError.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", queueId);
}
