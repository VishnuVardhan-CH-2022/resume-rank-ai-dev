import type { JobProgressSummary } from "@/modules/ranking/types";

/**
 * ProgressSummary — UXD catalog; counts from job_progress_summary.
 */
export function ProgressSummary({
  summary,
}: {
  summary: JobProgressSummary | null | undefined;
}) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">No progress data yet.</p>
    );
  }

  const rows: Array<{ label: string; value: number }> = [
    { label: "Total", value: summary.total_candidates },
    { label: "Uploaded", value: summary.uploaded_count },
    { label: "Queued", value: summary.queued_count },
    { label: "Parsing", value: summary.parsing_count },
    { label: "AI", value: summary.ai_processing_count },
    { label: "Completed", value: summary.completed_count },
    { label: "Failed", value: summary.failed_total },
  ];

  return (
    <div aria-live="polite">
      <p className="mb-3 text-sm text-muted-foreground">
        {summary.percent_completed}% completed
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
        {rows.map((row) => (
          <div key={row.label} className="border border-border px-3 py-2">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
