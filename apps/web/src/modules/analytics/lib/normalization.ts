import {
  SCORE_BUCKET_LABELS,
  type ScoreBucket,
} from "../types.ts";

function asCount(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

/**
 * Complete the fixed ADS §9.4 buckets even when a view result is sparse.
 */
export function normalizeScoreBuckets(rows: unknown[]): ScoreBucket[] {
  const byRange = new Map<string, number>();
  for (const row of rows) {
    const typed = row as Record<string, unknown>;
    if (typeof typed.range === "string") {
      byRange.set(typed.range, asCount(typed.count));
    }
  }

  return SCORE_BUCKET_LABELS.map((range) => ({
    range,
    count: byRange.get(range) ?? 0,
  }));
}
