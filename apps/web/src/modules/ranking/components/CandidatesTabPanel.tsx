import { useMemo, useState } from "react";
import { RankingTable } from "@/components/domain/RankingTable";
import { PollingIndicator } from "@/components/domain/PollingIndicator";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/domain/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCandidateRanking,
  useScreeningPoll,
  rankingKeys,
} from "@/modules/ranking/hooks/useRanking";
import { useRetryCandidate } from "@/modules/screening/hooks/useScreening";
import { getSafeErrorMessage, type ErrorObject } from "@/lib/errors";
import type { RankingListFilter } from "@/modules/ranking/types";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_FILTERS: Array<{
  id: RankingListFilter["status"];
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "queued", label: "Queued" },
  { id: "ai_processing", label: "AI" },
  { id: "failed", label: "Failed" },
  { id: "uploaded", label: "Uploaded" },
];

type CandidatesTabPanelProps = {
  jobId: string;
  jobActive: boolean;
  pollToken: number;
};

/**
 * Job Details Candidates / Ranking tab — UXD §6.10.
 */
export function CandidatesTabPanel({
  jobId,
  jobActive,
  pollToken,
}: CandidatesTabPanelProps) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<RankingListFilter["status"]>("all");
  const [q, setQ] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const filter = useMemo(
    () => ({
      status,
      q,
      includeArchived,
      page,
      pageSize: 20,
    }),
    [status, q, includeArchived, page],
  );

  const rankingQuery = useCandidateRanking(jobId, filter);
  const { phase } = useScreeningPoll(jobId, {
    enabled: true,
    forceStart: pollToken > 0,
  });
  const retryMutation = useRetryCandidate(jobId);

  async function onRetry(candidateId: string) {
    setActionError(null);
    try {
      await retryMutation.mutateAsync(candidateId);
      void qc.invalidateQueries({ queryKey: rankingKeys.all });
    } catch (err) {
      setActionError(getSafeErrorMessage(err as ErrorObject));
    }
  }

  const items = rankingQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-medium">Candidates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordered by server ranking. Non-completed scores show as —.
          </p>
        </div>
        <PollingIndicator phase={phase} />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
        {STATUS_FILTERS.map((item) => (
          <Button
            key={String(item.id)}
            size="sm"
            variant={status === item.id ? "default" : "outline"}
            onClick={() => {
              setStatus(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block grow text-sm">
          <span className="text-muted-foreground">Search name</span>
          <Input
            className="mt-1"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Candidate name"
            maxLength={200}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => {
              setIncludeArchived(e.target.checked);
              setPage(1);
            }}
          />
          Show archived
        </label>
      </div>

      {actionError ? (
        <ErrorState message={actionError} onRetry={() => setActionError(null)} />
      ) : null}

      {rankingQuery.isLoading ? (
        <LoadingState label="Loading candidates…" />
      ) : null}
      {rankingQuery.error ? (
        <ErrorState
          message={getSafeErrorMessage(rankingQuery.error)}
          onRetry={() => void rankingQuery.refetch()}
        />
      ) : null}

      {!rankingQuery.isLoading && items.length === 0 ? (
        <EmptyState
          title="No candidates"
          body="Upload resumes, then Start Screening. Completed candidates appear ranked by score."
        />
      ) : null}

      {items.length > 0 ? (
        <RankingTable
          jobId={jobId}
          items={items}
          jobActive={jobActive}
          retryingId={
            retryMutation.isPending
              ? (retryMutation.variables as string | undefined) ?? null
              : null
          }
          onRetry={(id) => void onRetry(id)}
        />
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">Page {page}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={items.length < 20}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
