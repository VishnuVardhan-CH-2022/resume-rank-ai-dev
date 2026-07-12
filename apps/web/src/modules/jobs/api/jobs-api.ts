/**
 * Jobs API — ADS §5 via Supabase PostgREST (RR-DEV-012 CP-11).
 */
import { getSupabase } from "@/lib/supabase";
import {
  createErrorObject,
  fromPostgrestError,
  type ErrorObject,
} from "@/lib/errors";
import type {
  CreateJobInput,
  Job,
  JobListFilter,
  UpdateJobInput,
} from "@/modules/jobs/types";
import { trimJobFields } from "@/modules/jobs/lib/validation";

export type JobsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorObject };

const PAGE_SIZE = 20;

export function getJobsPageSize(): number {
  return PAGE_SIZE;
}

export async function listJobs(options: {
  filter?: JobListFilter;
  q?: string;
  page?: number;
}): Promise<JobsResult<Job[]>> {
  const filter = options.filter ?? "active";
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = getSupabase()
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filter === "active") {
    query = query.eq("lifecycle_status", "active");
  } else if (filter === "archived") {
    query = query.eq("lifecycle_status", "archived");
  }

  const q = options.q?.trim().slice(0, 200);
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: fromPostgrestError(error) };
  return { ok: true, data: (data ?? []) as Job[] };
}

export async function getJob(jobId: string): Promise<JobsResult<Job>> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  if (!data) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Job not found.",
      }),
    };
  }
  return { ok: true, data: data as Job };
}

export async function createJob(
  input: CreateJobInput,
): Promise<JobsResult<Job>> {
  const trimmed = trimJobFields(input);
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
    .insert({
      title: trimmed.title,
      jd_text: trimmed.jd_text,
      owner_user_id: user.id,
      lifecycle_status: "active",
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  return { ok: true, data: data as Job };
}

export async function updateJob(
  jobId: string,
  input: UpdateJobInput,
): Promise<JobsResult<Job>> {
  const patch: UpdateJobInput = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.jd_text !== undefined) patch.jd_text = input.jd_text.trim();

  const { data, error } = await getSupabase()
    .from("jobs")
    .update(patch)
    .eq("id", jobId)
    .eq("lifecycle_status", "active")
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  if (!data) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-FORB",
        message: "This job cannot be edited (archived or not found).",
      }),
    };
  }
  return { ok: true, data: data as Job };
}

export async function archiveJob(jobId: string): Promise<JobsResult<Job>> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .update({ lifecycle_status: "archived" })
    .eq("id", jobId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  if (!data) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Job not found.",
      }),
    };
  }
  return { ok: true, data: data as Job };
}

export async function countCandidatesForJob(
  jobId: string,
): Promise<JobsResult<number>> {
  const { count, error } = await getSupabase()
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  if (error) return { ok: false, error: fromPostgrestError(error) };
  return { ok: true, data: count ?? 0 };
}

/**
 * Hard delete only when zero candidates (VR-04).
 * Returns EH-VAL with guidance when blocked; PostgREST may also return conflict.
 */
export async function deleteJobIfEmpty(
  jobId: string,
): Promise<JobsResult<null>> {
  const countResult = await countCandidatesForJob(jobId);
  if (!countResult.ok) return countResult;

  if (countResult.data > 0) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message:
          "This job has candidates. Archive it instead of deleting.",
        details: { reason: "candidates_exist", http_hint: 409 },
        retryable: false,
      }),
    };
  }

  const { error } = await getSupabase().from("jobs").delete().eq("id", jobId);
  if (error) {
    // FK RESTRICT / conflict
    const mapped = fromPostgrestError(error);
    if (
      error.code === "23503" ||
      /foreign key|restrict/i.test(error.message ?? "")
    ) {
      return {
        ok: false,
        error: createErrorObject({
          code: "EH-VAL",
          message:
            "This job has candidates. Archive it instead of deleting.",
          details: { reason: "candidates_exist", http_hint: 409 },
        }),
      };
    }
    return { ok: false, error: mapped };
  }

  return { ok: true, data: null };
}

/** Eligible for Start Screening when upload/screen phases land (ADS §8.2). */
export async function countScreenEligibleCandidates(
  jobId: string,
): Promise<JobsResult<number>> {
  const { count, error } = await getSupabase()
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .in("status", ["uploaded", "queued"]);

  if (error) return { ok: false, error: fromPostgrestError(error) };
  return { ok: true, data: count ?? 0 };
}
