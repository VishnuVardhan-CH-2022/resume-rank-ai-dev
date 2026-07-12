/**
 * Resume file validation — ADS §6.1 / UXD §8.3 / VR-10–13.
 */
import {
  ALLOWED_RESUME_MIME_TYPES,
  UPLOAD_MAX_BYTES,
  isAllowedResumeMimeType,
  isWithinUploadSizeLimit,
  sanitizeOriginalFilename,
} from "../../../lib/storagePaths";
import { createErrorObject, type ErrorObject } from "../../../lib/errors";

/** Soft guidance threshold — SRS-NFR-010 / VR-13 (demo capacity ≥20). */
export const BATCH_GUIDANCE_THRESHOLD = 20;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Infer MIME when the browser leaves `File.type` empty. */
export function resolveResumeMimeType(file: {
  name: string;
  type: string;
}): string {
  const typed = (file.type ?? "").trim().toLowerCase();
  if (typed && typed !== "application/octet-stream") {
    return typed;
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return DOCX_MIME;
  return typed || "application/octet-stream";
}

export function validateResumeFile(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true; mime: string; displayName: string } | { ok: false; error: ErrorObject } {
  const displayName = sanitizeOriginalFilename(file.name) || file.name || "resume";
  const mime = resolveResumeMimeType(file);

  if (file.size <= 0) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Empty files are not allowed.",
        details: { reason: "empty_file", filename: displayName, http_hint: 422 },
      }),
    };
  }

  if (!isWithinUploadSizeLimit(file.size)) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: `File exceeds the ${Math.round(UPLOAD_MAX_BYTES / (1024 * 1024))} MB limit.`,
        details: {
          reason: "file_too_large",
          filename: displayName,
          size_bytes: file.size,
          max_bytes: UPLOAD_MAX_BYTES,
          http_hint: 422,
        },
      }),
    };
  }

  if (!isAllowedResumeMimeType(mime)) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Only PDF and DOCX resumes are accepted.",
        details: {
          reason: "unsupported_type",
          filename: displayName,
          mime_type: mime,
          allowed: [...ALLOWED_RESUME_MIME_TYPES],
          http_hint: 422,
        },
      }),
    };
  }

  return { ok: true, mime, displayName };
}

export function shouldWarnLargeBatch(fileCount: number): boolean {
  return fileCount >= BATCH_GUIDANCE_THRESHOLD;
}
