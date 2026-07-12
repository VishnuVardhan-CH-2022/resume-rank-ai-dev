import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { ScoreIndicator } from "@/components/domain/ScoreIndicator";
import type { RankingRow } from "@/modules/ranking/types";

type RankingTableProps = {
  jobId: string;
  items: RankingRow[];
  jobActive: boolean;
  retryingId?: string | null;
  onRetry?: (candidateId: string) => void;
};

/**
 * RankingTable — UXD §9. Trust server order; no client re-sort.
 */
export function RankingTable({
  jobId,
  items,
  jobActive,
  retryingId,
  onRetry,
}: RankingTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Rank</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Summary</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <RankingRowView
                key={row.candidate_id}
                jobId={jobId}
                row={row}
                jobActive={jobActive}
                retrying={retryingId === row.candidate_id}
                onRetry={onRetry}
                layout="table"
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — UXD §12 */}
      <ul className="space-y-3 md:hidden">
        {items.map((row) => (
          <RankingRowView
            key={row.candidate_id}
            jobId={jobId}
            row={row}
            jobActive={jobActive}
            retrying={retryingId === row.candidate_id}
            onRetry={onRetry}
            layout="card"
          />
        ))}
      </ul>
    </>
  );
}

function RankingRowView({
  jobId,
  row,
  jobActive,
  retrying,
  onRetry,
  layout,
}: {
  jobId: string;
  row: RankingRow;
  jobActive: boolean;
  retrying: boolean;
  onRetry?: (candidateId: string) => void;
  layout: "table" | "card";
}) {
  const name = row.name?.trim() || "Unnamed candidate";
  const canRetry = jobActive && row.status === "failed_ai";
  const detailPath = `/jobs/${jobId}/candidates/${row.candidate_id}`;
  const summary =
    row.summary?.trim().slice(0, 120) ||
    (row.failure_message ? row.failure_message.slice(0, 120) : "—");

  if (layout === "card") {
    return (
      <li className="border border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={row.status} />
              <ScoreIndicator score={row.match_score} size="sm" />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            render={<Link to={detailPath} />}
          >
            View
          </Button>
        </div>
        {canRetry && onRetry ? (
          <Button
            size="sm"
            className="mt-3"
            disabled={retrying}
            onClick={() => onRetry(row.candidate_id)}
          >
            {retrying ? "Retrying…" : "Retry Screening"}
          </Button>
        ) : null}
      </li>
    );
  }

  return (
    <tr className="border-b border-border/70 align-top">
      <td className="px-3 py-2 tabular-nums text-muted-foreground">
        {row.rank ?? "—"}
      </td>
      <td className="px-3 py-2 font-medium">{name}</td>
      <td className="px-3 py-2">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-3 py-2">
        <ScoreIndicator score={row.match_score} size="sm" />
      </td>
      <td className="px-3 py-2 text-muted-foreground">{summary}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            render={<Link to={detailPath} />}
          >
            View
          </Button>
          {canRetry && onRetry ? (
            <Button
              size="sm"
              disabled={retrying}
              onClick={() => onRetry(row.candidate_id)}
            >
              {retrying ? "Retrying…" : "Retry Screening"}
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
