/**
 * retry-candidate — ADS POST /candidates/{id}/retry (RR-DEV-012 CP-16).
 *
 * JWT + Idempotency-Key required.
 * Eligible: failed_ai only (not failed_parse).
 * 202 shape identical to screen-job. Never calls Gemini.
 */
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createErrorObject } from "../_shared/errors.ts";
import { requireIdempotencyKey, requireUser } from "../_shared/auth.ts";
import { getServiceRoleClient } from "../_shared/supabase.ts";
import {
  canonicalizeRetryBody,
  hashCanonicalBody,
} from "../_shared/hashing.ts";
import {
  lookupIdempotency,
  storeIdempotency,
} from "../_shared/idempotency.ts";
import {
  buildAcceptedPayload,
  enqueueCandidates,
  loadRetryCandidate,
} from "../_shared/enqueue.ts";

type RetryBody = {
  candidate_id?: string;
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

  let body: RetryBody;
  try {
    body = (await req.json()) as RetryBody;
  } catch {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "Request body must be valid JSON.",
      }),
      400,
    );
  }

  const candidateId =
    typeof body.candidate_id === "string" ? body.candidate_id.trim() : "";
  if (!candidateId) {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "candidate_id is required.",
        details: { field: "candidate_id" },
      }),
      400,
    );
  }

  const bodyHash = await hashCanonicalBody(canonicalizeRetryBody(candidateId));
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
    return jsonResponse(existing.error, 409);
  }

  const loaded = await loadRetryCandidate(admin, candidateId, auth.user.id);
  if (!loaded.ok) return jsonResponse(loaded.error, loaded.status);

  const acceptedIds = await enqueueCandidates(
    admin,
    loaded.job.id,
    [loaded.candidate],
    auth.user.id,
  );

  if (acceptedIds.length === 0) {
    return jsonResponse(
      createErrorObject({
        code: "EH-SYS",
        message: "Failed to enqueue candidate for retry.",
        retryable: true,
      }),
      500,
    );
  }

  const payload = buildAcceptedPayload(loaded.job.id, acceptedIds);
  await storeIdempotency(admin, {
    userId: auth.user.id,
    key: idem.key,
    route: "retry",
    bodyHash,
    responseStatus: 202,
    responseBody: payload,
  });

  console.log("retry_candidate_accepted", {
    job_id: loaded.job.id,
    candidate_id: candidateId,
  });

  return jsonResponse(payload, 202);
});
