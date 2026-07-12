/**
 * Analytics view contracts — ADS §9 / RR-DB-005 §10.6.
 *
 * All values are read-only and owner-scoped by security_invoker views + RLS.
 */

export type DashboardMetrics = {
  owner_user_id: string | null;
  active_jobs: number;
  total_candidates: number;
  completed_count: number;
  failed_count: number;
  avg_match_score: number | null;
};

export type ScreeningStatistics = {
  job_id: string;
  uploaded_count: number;
  queued_count: number;
  completed_count: number;
  failed_parse_count: number;
  failed_ai_count: number;
  avg_match_score: number | null;
};

export const SCORE_BUCKET_LABELS = [
  "0-20",
  "21-40",
  "41-60",
  "61-80",
  "81-100",
] as const;

export type ScoreBucketLabel = (typeof SCORE_BUCKET_LABELS)[number];

export type ScoreBucket = {
  range: ScoreBucketLabel;
  count: number;
};
