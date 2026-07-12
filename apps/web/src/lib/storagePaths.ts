/**
 * Resume Storage paths — RR-DEV-012 CP-14 / RR-DB-005 §5.5 / RR-DEP-011 §11.
 *
 * Logical (DDD): resumes/{owner_id}/{job_id}/{candidate_id}/{filename}
 * Bucket id:     resumes
 * Object key:    {owner_id}/{job_id}/{candidate_id}/{filename}
 *
 * owner_id must equal auth.uid() at upload time (SEC §6.2).
 */

export const RESUMES_BUCKET = "resumes" as const;

/** Default upload max — DEP §6.3 / SRS-NFR-024 (5 MB). */
export const UPLOAD_MAX_BYTES = 5_242_880;

export const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type AllowedResumeMimeType = (typeof ALLOWED_RESUME_MIME_TYPES)[number];

export type ResumePathParts = {
  ownerId: string;
  jobId: string;
  candidateId: string;
  /** Collision-safe object filename (not necessarily display name). */
  objectFilename: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected UUID`);
  }
}

/** Strip path separators and unsafe characters from a display filename. */
export function sanitizeOriginalFilename(originalFilename: string): string {
  const base = originalFilename.split(/[/\\]/).pop()?.trim() || "resume";
  const cleaned = base
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 180);
  return cleaned || "resume";
}

/**
 * Collision-safe object key leaf while preserving original extension/name.
 * Example: `a1b2…_My_Resume.pdf`
 */
export function makeCollisionSafeFilename(
  originalFilename: string,
  uniqueId: string = crypto.randomUUID(),
): string {
  assertUuid(uniqueId, "uniqueId");
  const safe = sanitizeOriginalFilename(originalFilename);
  return `${uniqueId}_${safe}`;
}

/** Object key within the `resumes` bucket (Storage API upload path). */
export function buildResumeObjectKey(parts: ResumePathParts): string {
  assertUuid(parts.ownerId, "ownerId");
  assertUuid(parts.jobId, "jobId");
  assertUuid(parts.candidateId, "candidateId");
  if (!parts.objectFilename.trim()) {
    throw new Error("objectFilename is required");
  }
  if (
    parts.objectFilename.includes("/") ||
    parts.objectFilename.includes("\\")
  ) {
    throw new Error("objectFilename must not contain path separators");
  }

  return [
    parts.ownerId,
    parts.jobId,
    parts.candidateId,
    parts.objectFilename,
  ].join("/");
}

/**
 * Full logical path matching DDD/DEP documentation
 * (`resumes/{owner}/{job}/{candidate}/{filename}`).
 * Prefer storing this (or the object key) consistently in `resume_files.storage_path`.
 */
export function buildResumeStoragePath(parts: ResumePathParts): string {
  return `${RESUMES_BUCKET}/${buildResumeObjectKey(parts)}`;
}

/** Convert logical DDD path → bucket object key for Storage SDK calls. */
export function toResumeObjectKey(storagePathOrKey: string): string {
  const trimmed = storagePathOrKey.replace(/^\/+/, "");
  if (trimmed.startsWith(`${RESUMES_BUCKET}/`)) {
    return trimmed.slice(RESUMES_BUCKET.length + 1);
  }
  return trimmed;
}

/** Convert object key → logical DDD path. */
export function toResumeLogicalPath(objectKey: string): string {
  const key = toResumeObjectKey(objectKey);
  return `${RESUMES_BUCKET}/${key}`;
}

/** First folder segment must be the owner UUID (SEC §6.2 path binding). */
export function assertOwnerOwnsPath(
  ownerId: string,
  storagePathOrKey: string,
): void {
  assertUuid(ownerId, "ownerId");
  const key = toResumeObjectKey(storagePathOrKey);
  const first = key.split("/")[0];
  if (first !== ownerId) {
    throw new Error("Storage path owner_id must equal auth.uid()");
  }
}

export function isAllowedResumeMimeType(mime: string): mime is AllowedResumeMimeType {
  return (ALLOWED_RESUME_MIME_TYPES as readonly string[]).includes(mime);
}

export function isWithinUploadSizeLimit(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= UPLOAD_MAX_BYTES;
}
