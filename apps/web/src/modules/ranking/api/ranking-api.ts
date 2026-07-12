/**
 * Ranking / progress API — ADS §7.4–7.5 via PostgREST views.
 */
import { getSupabase } from "@/lib/supabase";
import {
  createErrorObject,
  fromPostgrestError,
  type ErrorObject,
} from "@/lib/errors";
import type {
  CandidateStatusPollRow,
  JobProgressSummary,
  RankingListFilter,
  RankingRow,
} from "@/modules/ranking/types";
import type { CandidateStatus } from "@/modules/uploads/types";

export type RankingResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorObject };

const DEFAULT_PAGE_SIZE = 20;

/** Trust server order — ADS §7.5. */
const RANKING_ORDER =
  "lifecycle_sort.asc,match_score.desc.nullslast,evaluated_at.desc.nullslast,candidate_id.asc";

export async function listCandidateRanking(
  jobId: string,
  filter: RankingListFilter = {},
): Promise<RankingResult<RankingRow[]>> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = getSupabase()
    .from("candidate_ranking")
    .select(
      "job_id, rank, candidate_id, name, status, match_score, summary, failure_code, failure_message, lifecycle_sort, updated_at, evaluated_at",
    )
    .eq("job_id", jobId)
    .order("lifecycle_sort", { ascending: true })
    .order("match_score", { ascending: false, nullsFirst: false })
    .order("evaluated_at", { ascending: false, nullsFirst: false })
    .order("candidate_id", { ascending: true })
    .range(from, to);

  if (!filter.includeArchived) {
    query = query.neq("status", "archived");
  }

  if (filter.status === "failed") {
    query = query.in("status", ["failed_ai", "failed_parse"]);
  } else if (filter.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  const q = filter.q?.trim().slice(0, 200);
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: fromPostgrestError(error) };
  return { ok: true, data: (data ?? []) as RankingRow[] };
}

export async function getJobProgressSummary(
  jobId: string,
): Promise<RankingResult<JobProgressSummary>> {
  const { data, error } = await getSupabase()
    .from("job_progress_summary")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  if (!data) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Progress summary not found.",
      }),
    };
  }
  return { ok: true, data: data as JobProgressSummary };
}

export async function pollCandidateStatuses(
  jobId: string,
): Promise<RankingResult<CandidateStatusPollRow[]>> {
  const { data, error } = await getSupabase()
    .from("candidates")
    .select("id, status, failure_code, updated_at")
    .eq("job_id", jobId);

  if (error) return { ok: false, error: fromPostgrestError(error) };
  return {
    ok: true,
    data: (data ?? []) as CandidateStatusPollRow[],
  };
}

export function getRankingPageSize(): number {
  return DEFAULT_PAGE_SIZE;
}

/** Exported for docs/tests — order string used conceptually. */
export function getRankingOrderHint(): string {
  return RANKING_ORDER;
}

export type { CandidateStatus };
