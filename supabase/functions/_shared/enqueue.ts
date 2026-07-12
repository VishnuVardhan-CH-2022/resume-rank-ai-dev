/**
 * Screen / retry enqueue helpers — ADS §8.0–8.3.
 * Service-role writes only after ownership re-check (SEC §5.4).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createErrorObject, type ErrorObject } from "./errors.ts";
import { isRetryEligibleStatus, isScreenEligibleStatus } from "./eligibility.ts";

export type ScreenAcceptedPayload = {
  accepted: true;
  job_id: string;
  accepted_candidate_ids: string[];
  status: "queued";
  message: "Processing accepted";
};

export function buildAcceptedPayload(
  jobId: string,
  acceptedCandidateIds: string[],
): ScreenAcceptedPayload {
  return {
    accepted: true,
    job_id: jobId,
    accepted_candidate_ids: acceptedCandidateIds,
    status: "queued",
    message: "Processing accepted",
  };
}

type JobRow = {
  id: string;
  owner_user_id: string;
  lifecycle_status: string;
  jd_text: string;
};

type CandidateRow = {
  id: string;
  job_id: string;
  status: string;
};

export type OwnedJobResult =
  | { ok: true; job: JobRow }
  | { ok: false; status: number; error: ErrorObject };

export async function loadOwnedActiveJob(
  admin: SupabaseClient,
  jobId: string,
  userId: string,
): Promise<OwnedJobResult> {
  const { data, error } = await admin
    .from("jobs")
    .select("id, owner_user_id, lifecycle_status, jd_text")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      error: createErrorObject({
        code: "EH-SYS",
        message: "Failed to load job.",
        retryable: true,
      }),
    };
  }
  if (!data) {
    return {
      ok: false,
      status: 404,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Job not found.",
        details: { http_hint: 404 },
      }),
    };
  }

  const job = data as JobRow;
  if (job.owner_user_id !== userId) {
    return {
      ok: false,
      status: 403,
      error: createErrorObject({
        code: "EH-FORB",
        message: "You do not have access to this job.",
        details: { http_hint: 403 },
      }),
    };
  }
  if (job.lifecycle_status !== "active") {
    return {
      ok: false,
      status: 403,
      error: createErrorObject({
        code: "EH-FORB",
        message: "Archived jobs cannot be screened.",
        details: { http_hint: 403, reason: "job_archived" },
      }),
    };
  }
  if (!job.jd_text.trim()) {
    return {
      ok: false,
      status: 400,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Add a job description before screening.",
        details: { reason: "missing_jd", http_hint: 400 },
      }),
    };
  }

  return { ok: true, job };
}

/**
 * Select screen-eligible candidates. When `requestedIds` is provided:
 * - exclusively ineligible → 409
 * - mix → accept only eligible (skip others)
 */
export async function selectScreenEligible(
  admin: SupabaseClient,
  jobId: string,
  requestedIds: string[] | null,
): Promise<
  | { ok: true; candidates: CandidateRow[] }
  | { ok: false; status: number; error: ErrorObject }
> {
  let query = admin
    .from("candidates")
    .select("id, job_id, status")
    .eq("job_id", jobId);

  if (requestedIds && requestedIds.length > 0) {
    query = query.in("id", requestedIds);
  }

  const { data, error } = await query;
  if (error) {
    return {
      ok: false,
      status: 500,
      error: createErrorObject({
        code: "EH-SYS",
        message: "Failed to load candidates.",
        retryable: true,
      }),
    };
  }

  const rows = (data ?? []) as CandidateRow[];

  if (requestedIds && requestedIds.length > 0) {
    const found = new Set(rows.map((r) => r.id));
    const missing = requestedIds.filter((id) => !found.has(id));
    if (missing.length === requestedIds.length) {
      return {
        ok: false,
        status: 404,
        error: createErrorObject({
          code: "EH-VAL",
          message: "No matching candidates found for this job.",
          details: { http_hint: 404 },
        }),
      };
    }
    const eligible = rows.filter((r) => isScreenEligibleStatus(r.status));
    if (eligible.length === 0) {
      return {
        ok: false,
        status: 409,
        error: createErrorObject({
          code: "EH-VAL",
          message:
            "None of the requested candidates are eligible for screening (uploaded or queued only).",
          details: { reason: "exclusively_ineligible", http_hint: 409 },
        }),
      };
    }
    return { ok: true, candidates: eligible };
  }

  const eligible = rows.filter((r) => isScreenEligibleStatus(r.status));
  if (eligible.length === 0) {
    return {
      ok: false,
      status: 400,
      error: createErrorObject({
        code: "EH-VAL",
        message: "No eligible candidates to screen.",
        details: { reason: "no_eligible_candidates", http_hint: 400 },
      }),
    };
  }
  return { ok: true, candidates: eligible };
}

/** Ensure open processing_queue row + status queued (no duplicate open rows). */
export async function enqueueCandidates(
  admin: SupabaseClient,
  jobId: string,
  candidates: CandidateRow[],
  actorUserId: string,
): Promise<string[]> {
  const accepted: string[] = [];

  for (const candidate of candidates) {
    const { error: insertError } = await admin.from("processing_queue").insert({
      candidate_id: candidate.id,
      job_id: jobId,
      queue_status: "pending",
      attempt_count: 0,
      available_at: new Date().toISOString(),
    });

    if (insertError) {
      // Unique open-entry index → already enqueued; treat as accepted.
      const isDup =
        insertError.code === "23505" ||
        /duplicate|unique/i.test(insertError.message ?? "");
      if (!isDup) {
        console.error("queue_insert_failed", {
          code: insertError.code,
          candidate_id: candidate.id,
        });
        continue;
      }
    }

    if (candidate.status !== "queued") {
      const { error: statusError } = await admin
        .from("candidates")
        .update({ status: "queued", failure_code: null, failure_message: null })
        .eq("id", candidate.id);
      if (statusError) {
        console.error("candidate_status_failed", {
          code: statusError.code,
          candidate_id: candidate.id,
        });
        continue;
      }
    }

    accepted.push(candidate.id);
  }

  if (accepted.length > 0) {
    await admin.from("audit_logs").insert({
      actor_user_id: actorUserId,
      job_id: jobId,
      event_type: "enqueue",
      payload: { candidate_ids: accepted, source: "screen_or_retry" },
    });
  }

  return accepted;
}

export async function loadRetryCandidate(
  admin: SupabaseClient,
  candidateId: string,
  userId: string,
): Promise<
  | { ok: true; candidate: CandidateRow; job: JobRow }
  | { ok: false; status: number; error: ErrorObject }
> {
  const { data, error } = await admin
    .from("candidates")
    .select("id, job_id, status")
    .eq("id", candidateId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      error: createErrorObject({
        code: "EH-SYS",
        message: "Failed to load candidate.",
        retryable: true,
      }),
    };
  }
  if (!data) {
    return {
      ok: false,
      status: 404,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Candidate not found.",
        details: { http_hint: 404 },
      }),
    };
  }

  const candidate = data as CandidateRow;
  const jobResult = await loadOwnedActiveJob(admin, candidate.job_id, userId);
  if (!jobResult.ok) {
    // Hide existence from non-owners → 403/404 style
    if (jobResult.status === 404) {
      return {
        ok: false,
        status: 404,
        error: createErrorObject({
          code: "EH-VAL",
          message: "Candidate not found.",
          details: { http_hint: 404 },
        }),
      };
    }
    return jobResult;
  }

  if (!isRetryEligibleStatus(candidate.status)) {
    return {
      ok: false,
      status: 409,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Only candidates with status failed_ai can be retried.",
        details: {
          reason: "not_failed_ai",
          status: candidate.status,
          http_hint: 409,
        },
      }),
    };
  }

  return { ok: true, candidate, job: jobResult.job };
}
