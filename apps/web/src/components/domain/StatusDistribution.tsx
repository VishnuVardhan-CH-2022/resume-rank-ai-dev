import type { JobProgressSummary } from "@/modules/ranking/types";

/**
 * StatusDistribution — text/table alternative to a chart (UXD §7).
 */
export function StatusDistribution({
  summary,
}: {
  summary: JobProgressSummary | null | undefined;
}) {
  if (!summary || summary.total_candidates === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status distribution yet.
      </p>
    );
  }

  const rows = [
    ["uploaded", summary.uploaded_count],
    ["queued", summary.queued_count],
    ["parsing", summary.parsing_count],
    ["parsed", summary.parsed_count],
    ["ai_processing", summary.ai_processing_count],
    ["completed", summary.completed_count],
    ["failed_parse", summary.failed_parse_count],
    ["failed_ai", summary.failed_ai_count],
    ["archived", summary.archived_count],
  ] as const;

  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Candidate status distribution</caption>
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th className="py-2 font-medium">Status</th>
          <th className="py-2 font-medium">Count</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([status, count]) => (
          <tr key={status} className="border-b border-border/60">
            <td className="py-2">{status}</td>
            <td className="py-2 tabular-nums">{count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
