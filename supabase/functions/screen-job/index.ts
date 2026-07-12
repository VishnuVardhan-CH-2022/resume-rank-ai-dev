/**
 * screen-job — ADS POST /jobs/{job_id}/screen (RR-DEV-012 CP-15).
 *
 * JWT + Idempotency-Key required.
 * Eligible: uploaded | queued only.
 * Returns 202 without scores. Never calls Gemini.
 */
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createErrorObject } from "../_shared/errors.ts";
import { requireIdempotencyKey, requireUser } from "../_shared/auth.ts";
import { getServiceRoleClient } from "../_shared/supabase.ts";
import {
  canonicalizeScreenBody,
  hashCanonicalBody,
} from "../_shared/hashing.ts";
import {
  lookupIdempotency,
  storeIdempotency,
} from "../_shared/idempotency.ts";
import {
  buildAcceptedPayload,
  enqueueCandidates,
  loadOwnedActiveJob,
  selectScreenEligible,
} from "../_shared/enqueue.ts";

type ScreenBody = {
  job_id?: string;
  candidate_ids?: string[];
};

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

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse(auth.error, auth.status);

  const idem = requireIdempotencyKey(req);
  if (!idem.ok) return jsonResponse(idem.error, idem.status);

  let body: ScreenBody;
  try {
    body = (await req.json()) as ScreenBody;
  } catch {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "Request body must be valid JSON.",
      }),
      400,
    );
  }

  const jobId = typeof body.job_id === "string" ? body.job_id.trim() : "";
  if (!jobId) {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "job_id is required.",
        details: { field: "job_id" },
      }),
      400,
    );
  }

  const candidateIds = Array.isArray(body.candidate_ids)
    ? body.candidate_ids.filter((id): id is string => typeof id === "string")
    : null;

  const canonical = canonicalizeScreenBody({
    job_id: jobId,
    candidate_ids: candidateIds,
  });
  const bodyHash = await hashCanonicalBody(canonical);
  const admin = getServiceRoleClient();

  const existing = await lookupIdempotency(
    admin,
    auth.user.id,
    idem.key,
    bodyHash,
  );
  if (existing.kind === "replay") {
    return jsonResponse(existing.body, existing.status);
  }
  if (existing.kind === "conflict") {
    const hint =
      existing.error.error.details &&
      typeof existing.error.error.details === "object" &&
      "http_hint" in existing.error.error.details
        ? Number(existing.error.error.details.http_hint)
        : 409;
    return jsonResponse(existing.error, hint === 409 ? 409 : 500);
  }

  const jobResult = await loadOwnedActiveJob(admin, jobId, auth.user.id);
  if (!jobResult.ok) return jsonResponse(jobResult.error, jobResult.status);

  const eligible = await selectScreenEligible(admin, jobId, candidateIds);
  if (!eligible.ok) return jsonResponse(eligible.error, eligible.status);

  const acceptedIds = await enqueueCandidates(
    admin,
    jobId,
    eligible.candidates,
    auth.user.id,
  );

  if (acceptedIds.length === 0) {
    return jsonResponse(
      createErrorObject({
        code: "EH-SYS",
        message: "Failed to enqueue eligible candidates.",
        retryable: true,
      }),
      500,
    );
  }

  const payload = buildAcceptedPayload(jobId, acceptedIds);
  await storeIdempotency(admin, {
    userId: auth.user.id,
    key: idem.key,
    route: "screen",
    bodyHash,
    responseStatus: 202,
    responseBody: payload,
  });

  console.log("screen_job_accepted", {
    job_id: jobId,
    count: acceptedIds.length,
  });

  return jsonResponse(payload, 202);
});
