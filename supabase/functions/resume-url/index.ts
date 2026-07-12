/**
 * resume-url — ADS GET /candidates/{id}/resume (RR-DEV-012 CP-17).
 *
 * JWT required. Owner-only signed URL; default expires_in=300.
 * No permanent public URLs.
 */
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createErrorObject } from "../_shared/errors.ts";
import { requireUser } from "../_shared/auth.ts";
import {
  getServiceRoleClient,
  getSignedUrlExpiresIn,
} from "../_shared/supabase.ts";
import { RESUMES_BUCKET, toResumeObjectKey } from "../_shared/storagePaths.ts";

function readCandidateId(req: Request): string {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("candidate_id")?.trim() ?? "";
  if (fromQuery) return fromQuery;
  // Allow path-style trailing segment: /resume-url/<uuid>
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (
    last &&
    last !== "resume-url" &&
    /^[0-9a-f-]{36}$/i.test(last)
  ) {
    return last;
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "GET") {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "Method not allowed. Use GET.",
      }),
      405,
    );
  }

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse(auth.error, auth.status);

  const candidateId = readCandidateId(req);
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

  const admin = getServiceRoleClient();

  const { data: candidate, error: candError } = await admin
    .from("candidates")
    .select("id, job_id, original_filename")
    .eq("id", candidateId)
    .maybeSingle();

  if (candError) {
    return jsonResponse(
      createErrorObject({
        code: "EH-SYS",
        message: "Failed to load candidate.",
        retryable: true,
      }),
      500,
    );
  }
  if (!candidate) {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "Candidate not found.",
        details: { http_hint: 404 },
      }),
      404,
    );
  }

  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("id, owner_user_id")
    .eq("id", candidate.job_id)
    .maybeSingle();

  if (jobError || !job) {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "Candidate not found.",
        details: { http_hint: 404 },
      }),
      404,
    );
  }

  if (job.owner_user_id !== auth.user.id) {
    return jsonResponse(
      createErrorObject({
        code: "EH-FORB",
        message: "You do not have access to this resume.",
        details: { http_hint: 403 },
      }),
      403,
    );
  }

  const { data: fileRow, error: fileError } = await admin
    .from("resume_files")
    .select("storage_path, mime_type")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (fileError) {
    return jsonResponse(
      createErrorObject({
        code: "EH-SYS",
        message: "Failed to load resume metadata.",
        retryable: true,
      }),
      500,
    );
  }
  if (!fileRow) {
    return jsonResponse(
      createErrorObject({
        code: "EH-VAL",
        message: "Resume file not found for this candidate.",
        details: { http_hint: 404 },
      }),
      404,
    );
  }

  const expiresIn = getSignedUrlExpiresIn();
  const objectKey = toResumeObjectKey(fileRow.storage_path);
  const { data: signed, error: signError } = await admin.storage
    .from(RESUMES_BUCKET)
    .createSignedUrl(objectKey, expiresIn);

  if (signError || !signed?.signedUrl) {
    return jsonResponse(
      createErrorObject({
        code: "EH-STORE",
        message: "Failed to create signed resume URL.",
        retryable: true,
        details: { vendor: signError?.message },
      }),
      500,
    );
  }

  return jsonResponse(
    {
      candidate_id: candidateId,
      signed_url: signed.signedUrl,
      expires_in: expiresIn,
      mime_type: fileRow.mime_type,
      original_filename: candidate.original_filename,
    },
    200,
  );
});
