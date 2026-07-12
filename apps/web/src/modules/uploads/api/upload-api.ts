/**
 * Upload API — ADS §6 via Storage + PostgREST (RR-DEV-012 CP-13).
 *
 * Storage first → candidates (`uploaded`) + resume_files.
 * No processing_queue. No Gemini.
 * DD-05: delete Storage object if DB persist fails after Storage success.
 */
import { getSupabase } from "@/lib/supabase";
import {
  RESUMES_BUCKET,
  assertOwnerOwnsPath,
  buildResumeObjectKey,
  buildResumeStoragePath,
  makeCollisionSafeFilename,
} from "@/lib/storagePaths";
import {
  createErrorObject,
  fromPostgrestError,
  fromStorageError,
  type ErrorObject,
} from "@/lib/errors";
import { validateResumeFile } from "@/modules/uploads/lib/validation";
import type {
  BatchUploadResponse,
  Candidate,
  UploadFileResult,
} from "@/modules/uploads/types";

export type UploadsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorObject };

type JobGateRow = {
  id: string;
  owner_user_id: string;
  lifecycle_status: string;
};

async function assertActiveOwnedJob(
  jobId: string,
): Promise<UploadsResult<JobGateRow>> {
  const {
    data: { user },
    error: userError,
  } = await getSupabase().auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-AUTH",
        message: "Authentication required or session expired.",
      }),
    };
  }

  const { data, error } = await getSupabase()
    .from("jobs")
    .select("id, owner_user_id, lifecycle_status")
    .eq("id", jobId)
    .maybeSingle();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  if (!data) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Job not found.",
        details: { http_hint: 404 },
      }),
    };
  }

  const job = data as JobGateRow;
  if (job.owner_user_id !== user.id) {
    return {
      ok: false,
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
      error: createErrorObject({
        code: "EH-FORB",
        message: "Archived jobs cannot accept new uploads.",
        details: { http_hint: 403, reason: "job_archived" },
      }),
    };
  }

  return { ok: true, data: job };
}

async function compensateStorageObject(objectKey: string): Promise<void> {
  try {
    await getSupabase().storage.from(RESUMES_BUCKET).remove([objectKey]);
  } catch {
    // Best-effort ignore (SDD DD-05)
  }
}

/**
 * Upload one resume: validate → Storage PUT → DB insert → 201-shaped Candidate.
 * Never enqueues processing_queue (TC-UPL-009).
 */
export async function uploadResumeFile(
  jobId: string,
  file: File,
): Promise<UploadFileResult> {
  const filename = file.name || "resume";
  const validated = validateResumeFile(file);
  if (!validated.ok) {
    return { ok: false, error: validated.error, filename };
  }

  const gate = await assertActiveOwnedJob(jobId);
  if (!gate.ok) {
    return { ok: false, error: gate.error, filename };
  }

  const ownerId = gate.data.owner_user_id;
  const candidateId = crypto.randomUUID();
  const objectFilename = makeCollisionSafeFilename(validated.displayName);
  const pathParts = {
    ownerId,
    jobId,
    candidateId,
    objectFilename,
  };
  const objectKey = buildResumeObjectKey(pathParts);
  const storagePath = buildResumeStoragePath(pathParts);
  assertOwnerOwnsPath(ownerId, storagePath);

  const { error: storageError } = await getSupabase()
    .storage.from(RESUMES_BUCKET)
    .upload(objectKey, file, {
      contentType: validated.mime,
      upsert: false,
    });

  if (storageError) {
    return {
      ok: false,
      error: fromStorageError(storageError),
      filename,
    };
  }

  // Nested insert keeps candidate + resume_files in one PostgREST transaction.
  const { data, error: dbError } = await getSupabase()
    .from("candidates")
    .insert({
      id: candidateId,
      job_id: jobId,
      status: "uploaded",
      original_filename: validated.displayName,
      resume_files: [
        {
          storage_bucket: RESUMES_BUCKET,
          storage_path: storagePath,
          mime_type: validated.mime,
          size_bytes: file.size,
        },
      ],
    })
    .select(
      "id, job_id, status, failure_code, failure_message, original_filename, created_at, updated_at",
    )
    .single();

  if (dbError || !data) {
    await compensateStorageObject(objectKey);
    return {
      ok: false,
      error: dbError
        ? fromPostgrestError(dbError)
        : createErrorObject({
            code: "EH-SYS",
            message: "Failed to persist candidate after upload.",
          }),
      filename,
    };
  }

  return {
    ok: true,
    candidate: data as Candidate,
    filename,
  };
}

/**
 * Batch upload — ADS §6.3: per-file isolation, partial success, `{ results: [] }`.
 */
export async function uploadResumeBatch(
  jobId: string,
  files: File[],
): Promise<UploadsResult<BatchUploadResponse>> {
  if (files.length === 0) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Select at least one resume file.",
      }),
    };
  }

  const gate = await assertActiveOwnedJob(jobId);
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const results: UploadFileResult[] = [];
  for (const file of files) {
    // Re-run per file (includes validation + storage + DB). Gate already passed;
    // archived race is re-checked inside uploadResumeFile.
    results.push(await uploadResumeFile(jobId, file));
  }

  return { ok: true, data: { results } };
}

/** List candidates for the Upload tab FileList (ADS §7.1). */
export async function listCandidatesForJob(
  jobId: string,
): Promise<UploadsResult<Candidate[]>> {
  const { data, error } = await getSupabase()
    .from("candidates")
    .select(
      "id, job_id, status, failure_code, failure_message, original_filename, created_at, updated_at",
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: fromPostgrestError(error) };
  return { ok: true, data: (data ?? []) as Candidate[] };
}
