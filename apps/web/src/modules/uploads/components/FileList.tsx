import type { Candidate, UploadFileResult } from "@/modules/uploads/types";
import { getSafeErrorMessage } from "@/lib/errors";

type FileListProps = {
  candidates: Candidate[];
  /** Latest batch results mapped to ADS `{ results: [] }`. */
  batchResults?: UploadFileResult[] | null;
  emptyMessage?: string;
};

/**
 * FileList — UXD catalog (RR-UXD-007 §6.8 / §8.3).
 * Shows persisted candidates plus last batch accept/reject rows.
 */
export function FileList({
  candidates,
  batchResults,
  emptyMessage = "No resumes uploaded yet.",
}: FileListProps) {
  const hasBatch = Boolean(batchResults && batchResults.length > 0);
  const hasCandidates = candidates.length > 0;

  if (!hasCandidates && !hasBatch) {
    return (
      <div className="border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasBatch ? (
        <section aria-label="Last upload results">
          <h3 className="mb-2 text-sm font-medium">Last upload results</h3>
          <ul className="divide-y divide-border border border-border">
            {batchResults!.map((row, index) => (
              <li
                key={`${row.filename}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-medium">{row.filename}</span>
                {row.ok ? (
                  <span className="text-xs text-muted-foreground">
                    accepted · status uploaded
                  </span>
                ) : (
                  <span className="text-xs text-destructive" role="status">
                    {row.error.error.code}: {getSafeErrorMessage(row.error)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasCandidates ? (
        <section aria-label="Uploaded candidates">
          <h3 className="mb-2 text-sm font-medium">
            Candidates ({candidates.length})
          </h3>
          <ul className="divide-y divide-border border border-border">
            {candidates.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>{c.original_filename}</span>
                <span className="text-xs text-muted-foreground">
                  {c.status}
                  <span className="mx-1.5 text-border">·</span>
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
