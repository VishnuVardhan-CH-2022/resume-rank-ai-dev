import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/domain/ErrorBanner";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { AISummaryPanel } from "@/components/domain/AISummaryPanel";
import { CandidateProfileView } from "@/components/domain/CandidateProfileView";
import { ResumePreview } from "@/components/domain/ResumePreview";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/domain/EmptyState";
import { useCandidateDetail } from "@/modules/candidates/hooks/useCandidateDetail";
import { useJob } from "@/modules/jobs/hooks/useJobs";
import { useRetryCandidate } from "@/modules/screening/hooks/useScreening";
import { rankingKeys } from "@/modules/ranking/hooks/useRanking";
import { candidateKeys } from "@/modules/candidates/hooks/useCandidateDetail";
import { getSafeErrorMessage, type ErrorObject } from "@/lib/errors";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Candidate Details — UXD §6.11 / CP-25.
 */
export function CandidateDetailPage() {
  const { jobId, candidateId } = useParams();
  const qc = useQueryClient();
  const jobQuery = useJob(jobId);
  const detailQuery = useCandidateDetail(candidateId);
  const retryMutation = useRetryCandidate(jobId ?? "");
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryAccepted, setRetryAccepted] = useState(false);

  const job = jobQuery.data;
  const archived = job?.lifecycle_status === "archived";
  const detail = detailQuery.data;
  const canRetry =
    Boolean(job) &&
    !archived &&
    detail?.candidate.status === "failed_ai";

  async function onRetry() {
    if (!candidateId || !canRetry) return;
    setActionError(null);
    setRetryAccepted(false);
    try {
      await retryMutation.mutateAsync(candidateId);
      setRetryAccepted(true);
      void qc.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });
      void qc.invalidateQueries({ queryKey: rankingKeys.all });
    } catch (err) {
      setActionError(getSafeErrorMessage(err as ErrorObject));
    }
  }

  const title =
    detail?.profile?.name?.trim() ||
    detail?.candidate.original_filename ||
    "Candidate";

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        <Link to="/jobs" className="text-primary underline">
          Jobs
        </Link>
        {jobId ? (
          <>
            {" · "}
            <Link to={`/jobs/${jobId}?tab=candidates`} className="text-primary underline">
              {job?.title ?? "Job"}
            </Link>
          </>
        ) : null}
        {" · "}
        <span>{title}</span>
      </p>

      {detailQuery.isLoading ? <LoadingState label="Loading candidate…" /> : null}
      {detailQuery.error ? (
        <ErrorState
          message={getSafeErrorMessage(detailQuery.error)}
          onRetry={() => void detailQuery.refetch()}
        />
      ) : null}
      {actionError ? <ErrorBanner error={actionError} /> : null}
      {retryAccepted ? (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          Retry accepted — candidate queued for screening.
        </p>
      ) : null}

      {detail ? (
        <>
          <PageHeader
            title={title}
            description={detail.candidate.original_filename}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={detail.candidate.status} />
                {canRetry ? (
                  <Button
                    disabled={retryMutation.isPending}
                    onClick={() => void onRetry()}
                  >
                    {retryMutation.isPending
                      ? "Retrying…"
                      : "Retry Screening"}
                  </Button>
                ) : null}
                {detail.candidate.status === "failed_parse" ? (
                  <span className="text-xs text-muted-foreground">
                    Parse failures cannot be retried — re-upload as a new
                    candidate.
                  </span>
                ) : null}
              </div>
            }
          />

          {detail.candidate.failure_message ? (
            <div
              role="alert"
              className="mb-6 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {detail.candidate.failure_code
                ? `${detail.candidate.failure_code}: `
                : null}
              {detail.candidate.failure_message}
            </div>
          ) : null}

          <div className="space-y-8">
            <AISummaryPanel
              score={detail.evaluation?.match_score}
              summary={detail.evaluation?.summary}
              rationale={detail.evaluation?.rationale}
              metadata={detail.evaluation?.model_metadata}
              evaluatedAt={detail.evaluation?.evaluated_at}
            />

            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Extracted profile
              </h2>
              <CandidateProfileView profile={detail.profile} />
            </section>

            {candidateId ? <ResumePreview candidateId={candidateId} /> : null}
          </div>
        </>
      ) : null}

      {!detailQuery.isLoading && !detail && !detailQuery.error ? (
        <EmptyState
          title="Candidate not found"
          body="This candidate may have been removed or is outside your access."
        />
      ) : null}
    </div>
  );
}
