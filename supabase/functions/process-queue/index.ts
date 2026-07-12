/**
 * process-queue — Phase 9 worker entry (RR-DEV-012 CP-18).
 *
 * Internal only: Authorization Bearer must equal SUPABASE_SERVICE_ROLE_KEY.
 * Not a public SPA feature (ADS API-02).
 *
 * Claim → parse → prompt → Gemini → validate → persist.
 */
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createErrorObject } from "../_shared/errors.ts";
import { getServiceRoleClient } from "../_shared/supabase.ts";
import { loadWorkerConfig } from "../../../services/resume-processing/config.ts";
import {
  processQueueItem,
  type QueueRow,
} from "../../../services/resume-processing/pipeline.ts";

function requireWorkerAuth(req: Request): boolean {
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!expected) return false;
  const header = req.headers.get("Authorization")?.trim() ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  return Boolean(token) && token === expected;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length || 1)) },
    async () => {
      while (index < items.length) {
        const current = index++;
        results[current] = await fn(items[current]!);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "Method not allowed. Use POST.",
      }),
      405,
    );
  }

  if (!requireWorkerAuth(req)) {
    return jsonResponse(
      createErrorObject({
        code: "EH-AUTH",
        message: "Worker authentication required.",
      }),
      401,
    );
  }

  let config;
  try {
    config = loadWorkerConfig();
  } catch (err) {
    return jsonResponse(
      createErrorObject({
        code: "EH-SYS",
        message:
          err instanceof Error
            ? err.message
            : "Worker configuration incomplete.",
      }),
      500,
    );
  }

  const lockOwner = `process-queue:${crypto.randomUUID()}`;
  const admin = getServiceRoleClient();

  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_processing_queue",
    {
      p_limit: Math.min(config.batchLimit, config.geminiConcurrency),
      p_lock_owner: lockOwner,
      p_visibility_ms: config.queueVisibilityMs,
    },
  );

  if (claimError) {
    console.error("claim_failed", { code: claimError.code });
    return jsonResponse(
      createErrorObject({
        code: "EH-SYS",
        message: "Failed to claim queue work.",
        retryable: true,
      }),
      500,
    );
  }

  const rows = (claimed ?? []) as QueueRow[];
  if (rows.length === 0) {
    return jsonResponse(
      {
        claimed: 0,
        results: [],
        message: "No pending queue work",
      },
      200,
    );
  }

  const results = await mapPool(
    rows,
    config.geminiConcurrency,
    async (row) => {
      try {
        const outcome = await processQueueItem(
          admin,
          { ...row, lock_owner: lockOwner },
          config,
        );
        return {
          queue_id: row.id,
          candidate_id: row.candidate_id,
          outcome: outcome.outcome,
        };
      } catch (err) {
        console.error("process_item_failed", {
          candidate_id: row.candidate_id,
          message: err instanceof Error ? err.message.slice(0, 120) : "error",
        });
        try {
          await admin
            .from("candidates")
            .update({
              status: "failed_ai",
              failure_code: "EH-AI",
              failure_message: "AI screening failed for this candidate.",
            })
            .eq("id", row.candidate_id);
          await admin
            .from("processing_queue")
            .update({
              queue_status: "dead",
              locked_at: null,
              lock_owner: null,
              last_error: "unhandled_worker_error",
            })
            .eq("id", row.id);
        } catch {
          // best-effort
        }
        return {
          queue_id: row.id,
          candidate_id: row.candidate_id,
          outcome: "failed_ai" as const,
        };
      }
    },
  );

  console.log("process_queue_batch", {
    claimed: rows.length,
    completed: results.filter((r) => r.outcome === "completed").length,
    failed_parse: results.filter((r) => r.outcome === "failed_parse").length,
    failed_ai: results.filter((r) => r.outcome === "failed_ai").length,
  });

  return jsonResponse(
    {
      claimed: rows.length,
      results,
      message: "Batch processed",
    },
    200,
  );
});
