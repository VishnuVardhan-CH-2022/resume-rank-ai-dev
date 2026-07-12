import { AnalyticsBarChart } from "@/components/domain/AnalyticsBarChart";
import { EmptyState, ErrorState, LoadingState } from "@/components/domain/EmptyState";
import { ProgressSummary } from "@/components/domain/ProgressSummary";
import { ScoreDistribution } from "@/components/domain/ScoreDistribution";
import { StatCard } from "@/components/domain/StatCard";
import { StatusDistribution } from "@/components/domain/StatusDistribution";
import { getSafeErrorMessage } from "@/lib/errors";
import {
  useJobScreeningStatistics,
  useScoreDistribution,
} from "@/modules/analytics/hooks/useAnalytics";
import { useJobProgress } from "@/modules/ranking/hooks/useRanking";
import type { JobProgressSummary } from "@/modules/ranking/types";

function toStatusBars(summary: JobProgressSummary) {
  return [
    { label: "uploaded", value: summary.uploaded_count },
    { label: "queued", value: summary.queued_count },
    { label: "parsing", value: summary.parsing_count },
    { label: "parsed", value: summary.parsed_count },
    { label: "ai_processing", value: summary.ai_processing_count },
    { label: "completed", value: summary.completed_count },
    { label: "failed_parse", value: summary.failed_parse_count },
    { label: "failed_ai", value: summary.failed_ai_count },
    { label: "archived", value: summary.archived_count },
  ];
}

function formatScore(score: number | null | undefined): string {
  return score == null ? "—" : `${Math.round(score * 10) / 10}`;
}

/**
 * Read-only job analytics snapshot shared by /analytics and Job Details.
 * Unlike the Progress tab, it deliberately does not start a polling loop.
 */
export function JobAnalyticsContent({
  jobId,
}: {
  jobId: string;
}) {
  const progressQuery = useJobProgress(jobId);
  const statisticsQuery = useJobScreeningStatistics(jobId);
  const scoresQuery = useScoreDistribution(jobId);

  const error =
    progressQuery.error ?? statisticsQuery.error ?? scoresQuery.error ?? null;
  const loading =
    progressQuery.isLoading ||
    statisticsQuery.isLoading ||
    scoresQuery.isLoading;

  if (loading && !progressQuery.data) {
    return <LoadingState label="Loading job analytics…" />;
  }

  if (error && !progressQuery.data) {
    return (
      <ErrorState
        message={getSafeErrorMessage(error)}
        onRetry={() => {
          void progressQuery.refetch();
          void statisticsQuery.refetch();
          void scoresQuery.refetch();
        }}
      />
    );
  }

  const progress = progressQuery.data;
  if (!progress || progress.total_candidates === 0) {
    return (
      <EmptyState
        title="No candidates yet"
        body="Upload resumes and Start Screening to populate job analytics."
      />
    );
  }

  const statistics = statisticsQuery.data;

  return (
    <div className="space-y-8">
      {error ? (
        <ErrorState
          message={getSafeErrorMessage(error)}
          onRetry={() => {
            void progressQuery.refetch();
            void statisticsQuery.refetch();
            void scoresQuery.refetch();
          }}
        />
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Job progress
        </h2>
        <ProgressSummary summary={progress} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Screening statistics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Queued"
            value={statistics?.queued_count ?? progress.queued_count}
          />
          <StatCard
            label="Completed"
            value={statistics?.completed_count ?? progress.completed_count}
          />
          <StatCard label="Failed" value={progress.failed_total} />
          <StatCard
            label="Average score"
            value={formatScore(statistics?.avg_match_score)}
            description="Completed candidates only"
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Status distribution
          </h2>
          <AnalyticsBarChart data={toStatusBars(progress)} />
          <div className="mt-4">
            <StatusDistribution summary={progress} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Score distribution
          </h2>
          {scoresQuery.data ? (
            <ScoreDistribution buckets={scoresQuery.data} />
          ) : (
            <LoadingState label="Loading score distribution…" />
          )}
        </section>
      </div>
    </div>
  );
}
