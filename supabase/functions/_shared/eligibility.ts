/**
 * Candidate status eligibility helpers (ADS §8.0, §8.3).
 * Kept pure for deterministic tests and shared command behavior.
 */
const SCREEN_ELIGIBLE_STATUSES = new Set(["uploaded", "queued"]);

export function isScreenEligibleStatus(status: string): boolean {
  return SCREEN_ELIGIBLE_STATUSES.has(status);
}

export function isRetryEligibleStatus(status: string): boolean {
  return status === "failed_ai";
}
