/**
 * Upload / candidate types — RR-API-006 §15.2 / §6.3; RR-DB-005 §5.3–5.4
 */
import type { ErrorObject } from "@/lib/errors";

export type CandidateStatus =
  | "uploaded"
  | "queued"
  | "parsing"
  | "parsed"
  | "ai_processing"
  | "completed"
  | "failed_parse"
  | "failed_ai"
  | "archived";

export type Candidate = {
  id: string;
  job_id: string;
  status: CandidateStatus;
  failure_code: string | null;
  failure_message: string | null;
  original_filename: string;
  created_at: string;
  updated_at: string;
};

export type ResumeFile = {
  id: string;
  candidate_id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  checksum: string | null;
  created_at: string;
};

/** ADS §6.3 batch item — success branch. */
export type UploadResultOk = {
  ok: true;
  candidate: Candidate;
  /** Original browser filename for UI row mapping. */
  filename: string;
};

/** ADS §6.3 batch item — failure branch. */
export type UploadResultErr = {
  ok: false;
  error: ErrorObject;
  filename: string;
};

export type UploadFileResult = UploadResultOk | UploadResultErr;

/** ADS §6.3 batch response body. */
export type BatchUploadResponse = {
  results: UploadFileResult[];
};

export type UploadFileProgress = {
  filename: string;
  phase: "validating" | "uploading" | "persisting" | "done" | "failed";
  percent?: number;
};
