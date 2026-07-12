/**
 * Analytics API — ADS §9 via owner-scoped security_invoker views.
 *
 * No client-side SQL, service-role key, or custom analytics endpoint.
 */
import { getSupabase } from "@/lib/supabase";
import {
  createErrorObject,
  fromPostgrestError,
  type ErrorObject,
} from "@/lib/errors";
import {
  type DashboardMetrics,
  type ScoreBucket,
  type ScreeningStatistics,
} from "@/modules/analytics/types";
import { normalizeScoreBuckets } from "@/modules/analytics/lib/normalization";

export type AnalyticsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorObject };

const EMPTY_DASHBOARD_METRICS: DashboardMetrics = {
  owner_user_id: null,
  active_jobs: 0,
  total_candidates: 0,
  completed_count: 0,
  failed_count: 0,
  avg_match_score: null,
};

function asCount(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function asNullableScore(value: unknown): number | null {
  if (value == null) return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toDashboardMetrics(value: unknown): DashboardMetrics {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    owner_user_id:
      typeof row.owner_user_id === "string" ? row.owner_user_id : null,
    active_jobs: asCount(row.active_jobs),
    total_candidates: asCount(row.total_candidates),
    completed_count: asCount(row.completed_count),
    failed_count: asCount(row.failed_count),
    avg_match_score: asNullableScore(row.avg_match_score),
  };
}

function toScreeningStatistics(value: unknown): ScreeningStatistics {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    job_id: typeof row.job_id === "string" ? row.job_id : "",
    uploaded_count: asCount(row.uploaded_count),
    queued_count: asCount(row.queued_count),
    completed_count: asCount(row.completed_count),
    failed_parse_count: asCount(row.failed_parse_count),
    failed_ai_count: asCount(row.failed_ai_count),
    avg_match_score: asNullableScore(row.avg_match_score),
  };
}

/**
 * Owner-level dashboard metrics. A user with no jobs has no view row, which
 * intentionally maps to zeroes for the Dashboard empty state.
 */
export async function getDashboardMetrics(): Promise<
  AnalyticsResult<DashboardMetrics>
> {
  const { data, error } = await getSupabase()
    .from("dashboard_metrics")
    .select(
      "owner_user_id, active_jobs, total_candidates, completed_count, failed_count, avg_match_score",
    )
    .maybeSingle();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  return {
    ok: true,
    data: data ? toDashboardMetrics(data) : EMPTY_DASHBOARD_METRICS,
  };
}

/** ADS §9.3 job throughput statistics. */
export async function getScreeningStatistics(
  jobId: string,
): Promise<AnalyticsResult<ScreeningStatistics>> {
  const { data, error } = await getSupabase()
    .from("screening_statistics")
    .select(
      "job_id, uploaded_count, queued_count, completed_count, failed_parse_count, failed_ai_count, avg_match_score",
    )
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) return { ok: false, error: fromPostgrestError(error) };
  if (!data) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Job analytics not found.",
      }),
    };
  }

  return { ok: true, data: toScreeningStatistics(data) };
}

/** ADS §9.4 completed-only score histogram, normalized to all five buckets. */
export async function getScoreDistribution(
  jobId: string,
): Promise<AnalyticsResult<ScoreBucket[]>> {
  const { data, error } = await getSupabase()
    .from("score_distribution")
    .select("range, count")
    .eq("job_id", jobId)
    .order("range", { ascending: true });

  if (error) return { ok: false, error: fromPostgrestError(error) };

  return { ok: true, data: normalizeScoreBuckets(data ?? []) };
}
