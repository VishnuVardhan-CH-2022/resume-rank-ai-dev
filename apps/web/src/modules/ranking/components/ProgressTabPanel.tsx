import { ProgressSummary } from "@/components/domain/ProgressSummary";
import { StatusDistribution } from "@/components/domain/StatusDistribution";
import { PollingIndicator } from "@/components/domain/PollingIndicator";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/domain/EmptyState";
import {
  useJobProgress,
  useScreeningPoll,
} from "@/modules/ranking/hooks/useRanking";
import { getSafeErrorMessage } from "@/lib/errors";
import type { PollPhase } from "@/modules/ranking/types";

type ProgressTabPanelProps = {
  jobId: string;
  pollToken: number;
};

/**
 * Job Details Progress tab — UXD §6.9.
 */
export function ProgressTabPanel({ jobId, pollToken }: ProgressTabPanelProps) {
  const progressQuery = useJobProgress(jobId);
  const { phase } = useScreeningPoll(jobId, {
    enabled: true,
    forceStart: pollToken > 0,
  });

  const summary = progressQuery.data;
  const empty =
    summary &&
    summary.total_candidates === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-medium">Screening progress</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live counts while candidates move through the pipeline.
          </p>
        </div>
        <PollingIndicator phase={phase as PollPhase} />
      </div>

      {progressQuery.isLoading ? <LoadingState label="Loading progress…" /> : null}
      {progressQuery.error ? (
        <ErrorState
          message={getSafeErrorMessage(progressQuery.error)}
          onRetry={() => void progressQuery.refetch()}
        />
      ) : null}

      {empty ? (
        <EmptyState
          title="Not started"
          body="Upload resumes and Start Screening to see progress."
        />
      ) : null}

      {summary && !empty ? (
        <>
          <ProgressSummary summary={summary} />
          <section>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Status distribution
            </h3>
            <StatusDistribution summary={summary} />
          </section>
        </>
      ) : null}
    </div>
  );
}
