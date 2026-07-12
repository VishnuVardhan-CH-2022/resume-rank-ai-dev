import { ScoreIndicator } from "@/components/domain/ScoreIndicator";

type AISummaryPanelProps = {
  score: number | null | undefined;
  summary: string | null | undefined;
  rationale: string | null | undefined;
  metadata?: Record<string, unknown> | null;
  evaluatedAt?: string | null;
};

/**
 * AISummaryPanel — plain text only (CP-25); no HTML.
 */
export function AISummaryPanel({
  score,
  summary,
  rationale,
  metadata,
  evaluatedAt,
}: AISummaryPanelProps) {
  const model =
    metadata && typeof metadata.model === "string" ? metadata.model : null;
  const promptVersion =
    metadata && typeof metadata.prompt_version === "string"
      ? metadata.prompt_version
      : null;

  if (!summary && !rationale && score == null) {
    return (
      <p className="text-sm text-muted-foreground">
        No evaluation yet for this candidate.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Match score
        </h2>
        <ScoreIndicator score={score ?? null} />
      </div>

      {summary ? (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Summary</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {summary}
          </p>
        </div>
      ) : null}

      {rationale ? (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Rationale
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {rationale}
          </p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {evaluatedAt
          ? `Evaluated ${new Date(evaluatedAt).toLocaleString()}`
          : null}
        {model ? ` · Model ${model}` : null}
        {promptVersion ? ` · Prompt ${promptVersion}` : null}
      </p>
    </section>
  );
}
