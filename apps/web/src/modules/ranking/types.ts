/**
 * Ranking / progress types — ADS §7.5 / view candidate_ranking + job_progress_summary.
 */
import type { CandidateStatus } from "@/modules/uploads/types";

export type RankingRow = {
  job_id: string;
  rank: number | null;
  candidate_id: string;
  name: string | null;
  status: CandidateStatus;
  match_score: number | null;
  summary: string | null;
  failure_code: string | null;
  failure_message: string | null;
  lifecycle_sort: number;
  updated_at: string;
  evaluated_at: string | null;
};

export type JobProgressSummary = {
  job_id: string;
  total_candidates: number;
  uploaded_count: number;
  queued_count: number;
  parsing_count: number;
  parsed_count: number;
  ai_processing_count: number;
  completed_count: number;
  failed_parse_count: number;
  failed_ai_count: number;
  archived_count: number;
  failed_total: number;
  percent_completed: number;
};

export type CandidateStatusPollRow = {
  id: string;
  status: CandidateStatus;
  failure_code: string | null;
  updated_at: string;
};

/** Terminal statuses — UXD §5.4.3 / ADS §8.4. */
export const TERMINAL_STATUSES: ReadonlySet<CandidateStatus> = new Set([
  "completed",
  "failed_parse",
  "failed_ai",
  "archived",
]);

export type PollPhase = "idle" | "polling" | "backoff" | "stopped";

export function isTerminalStatus(status: CandidateStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function allStatusesTerminal(
  rows: Array<{ status: CandidateStatus }>,
): boolean {
  if (rows.length === 0) return true;
  return rows.every((r) => isTerminalStatus(r.status));
}

export function fingerprintStatuses(
  rows: Array<{ id: string; status: string; updated_at: string }>,
): string {
  return [...rows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => `${r.id}:${r.status}:${r.updated_at}`)
    .join("|");
}

export type RankingListFilter = {
  status?: CandidateStatus | "all" | "failed";
  q?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
};
