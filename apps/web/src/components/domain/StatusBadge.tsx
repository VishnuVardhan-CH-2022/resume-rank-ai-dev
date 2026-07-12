import type { CandidateStatus } from "@/modules/uploads/types";

const STATUS_STYLES: Record<CandidateStatus, string> = {
  uploaded: "border-border bg-muted/40 text-foreground",
  queued: "border-border bg-muted/60 text-foreground",
  parsing: "border-amber-600/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  parsed: "border-amber-600/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  ai_processing:
    "border-sky-600/40 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  completed:
    "border-emerald-600/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  failed_parse:
    "border-destructive/40 bg-destructive/10 text-destructive",
  failed_ai: "border-destructive/40 bg-destructive/10 text-destructive",
  archived: "border-border bg-muted text-muted-foreground",
};

/**
 * StatusBadge — UXD catalog (authoritative candidate status; text + color).
 */
export function StatusBadge({ status }: { status: CandidateStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center border px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.uploaded,
      ].join(" ")}
    >
      {status}
    </span>
  );
}
