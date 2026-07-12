import { StatCard } from "@/components/domain/StatCard";
import type { DashboardMetrics } from "@/modules/analytics/types";

function formatScore(score: number | null): string {
  if (score == null) return "—";
  return `${Math.round(score * 10) / 10}`;
}

/**
 * Dashboard StatCard grid — UXD §6.3 / AC-G08.
 */
export function DashboardMetricsGrid({
  metrics,
  loading = false,
}: {
  metrics?: DashboardMetrics;
  loading?: boolean;
}) {
  const value = metrics ?? {
    active_jobs: 0,
    total_candidates: 0,
    completed_count: 0,
    failed_count: 0,
    avg_match_score: null,
  };

  return (
    <section
      aria-label="Dashboard metrics"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      <StatCard
        label="Active jobs"
        value={value.active_jobs}
        loading={loading}
      />
      <StatCard
        label="Candidates"
        value={value.total_candidates}
        loading={loading}
      />
      <StatCard
        label="Completed"
        value={value.completed_count}
        loading={loading}
      />
      <StatCard
        label="Failed"
        value={value.failed_count}
        loading={loading}
      />
      <StatCard
        label="Average score"
        value={formatScore(value.avg_match_score)}
        description="Completed candidates only"
        loading={loading}
      />
    </section>
  );
}
