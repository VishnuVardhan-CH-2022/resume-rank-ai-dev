/**
 * PollingIndicator — UXD §5.4 / §7. Prefer static text when reduced-motion.
 */
import type { PollPhase } from "@/modules/ranking/types";

export function PollingIndicator({ phase }: { phase: PollPhase }) {
  if (phase === "idle" || phase === "stopped") return null;

  const label =
    phase === "backoff"
      ? "Updating slowly…"
      : "Updating screening status…";

  return (
    <p
      className="text-xs text-muted-foreground"
      aria-live="polite"
      role="status"
    >
      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
      {label}
    </p>
  );
}
