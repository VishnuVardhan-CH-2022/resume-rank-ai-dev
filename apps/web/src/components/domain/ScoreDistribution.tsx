import { AnalyticsBarChart } from "@/components/domain/AnalyticsBarChart";
import type { ScoreBucket } from "@/modules/analytics/types";

/**
 * ScoreDistribution — completed-only score buckets with a static visual and
 * always-visible table alternative (UXD §13.4 / TC-ANL-003).
 */
export function ScoreDistribution({
  buckets,
}: {
  buckets: ScoreBucket[];
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Insufficient completed scores to show a distribution.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <AnalyticsBarChart
        data={buckets.map((bucket) => ({
          label: bucket.range,
          value: bucket.count,
        }))}
        valueLabel="Completed candidates"
      />

      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left text-xs text-muted-foreground">
          Completed candidates by match-score range
        </caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 font-medium">Score range</th>
            <th className="py-2 font-medium">Candidates</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.range} className="border-b border-border/60">
              <td className="py-2">{bucket.range}</td>
              <td className="py-2 tabular-nums">{bucket.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
