/**
 * Candidate detail API — ADS §7.2 nested GET.
 */
import { getSupabase } from "@/lib/supabase";
import {
  createErrorObject,
  fromPostgrestError,
  type ErrorObject,
} from "@/lib/errors";
import type { Candidate, CandidateStatus, ResumeFile } from "@/modules/uploads/types";

export type CandidateProfile = {
  candidate_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: unknown;
  education: unknown;
  experience: unknown;
  certifications: unknown;
  projects: unknown;
  resume_summary: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  languages: unknown;
  location: string | null;
  updated_at: string;
};

export type Evaluation = {
  id: string;
  candidate_id: string;
  job_id: string;
  match_score: number | null;
  rationale: string | null;
  summary: string | null;
  model_metadata: Record<string, unknown> | null;
  evaluated_at: string;
};

export type CandidateDetail = Candidate & {
  candidate_profiles: CandidateProfile | CandidateProfile[] | null;
  evaluations: Evaluation | Evaluation[] | null;
  resume_files: ResumeFile | ResumeFile[] | null;
};

export type CandidatesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorObject };

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function unwrapCandidateDetail(row: CandidateDetail): {
  candidate: Candidate;
  profile: CandidateProfile | null;
  evaluation: Evaluation | null;
  resumeFile: ResumeFile | null;
} {
  return {
    candidate: {
      id: row.id,
      job_id: row.job_id,
      status: row.status as CandidateStatus,
      failure_code: row.failure_code,
      failure_message: row.failure_message,
      original_filename: row.original_filename,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    profile: firstOrNull(row.candidate_profiles),
    evaluation: firstOrNull(row.evaluations),
    resumeFile: firstOrNull(row.resume_files),
  };
}

export async function getCandidateDetail(
  candidateId: string,
): Promise<CandidatesResult<CandidateDetail>> {
  const { data, error } = await getSupabase()
    .from("candidates")
    .select("*, candidate_profiles(*), evaluations(*), resume_files(*)")
    .eq("id", candidateId)
    .maybeSingle();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  if (!data) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Candidate not found.",
      }),
    };
  }
  return { ok: true, data: data as CandidateDetail };
}
