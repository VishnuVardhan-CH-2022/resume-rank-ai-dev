/**
 * Storage path helpers for signed resume URLs (DDD §5.5).
 */
export const RESUMES_BUCKET = "resumes";

/** Logical path or object key → bucket object key. */
export function toResumeObjectKey(storagePathOrKey: string): string {
  const trimmed = storagePathOrKey.replace(/^\/+/, "");
  if (trimmed.startsWith(`${RESUMES_BUCKET}/`)) {
    return trimmed.slice(RESUMES_BUCKET.length + 1);
  }
  return trimmed;
}
