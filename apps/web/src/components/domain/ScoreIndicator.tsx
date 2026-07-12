/**
 * ScoreIndicator — UXD catalog. Null → "—" / no score.
 */
export function ScoreIndicator({
  score,
  size = "md",
}: {
  score: number | null | undefined;
  size?: "sm" | "md";
}) {
  if (score == null || Number.isNaN(score)) {
    return (
      <span
        className="text-muted-foreground"
        aria-label="No score"
      >
        —
      </span>
    );
  }

  const rounded = Math.round(score * 10) / 10;
  return (
    <span
      className={
        size === "sm"
          ? "font-medium tabular-nums"
          : "text-lg font-semibold tabular-nums"
      }
      aria-label={`Match score ${rounded}`}
    >
      {rounded}
    </span>
  );
}
