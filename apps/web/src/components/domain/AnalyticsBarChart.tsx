/**
 * Static visual companion for analytics tables.
 *
 * The chart is hidden below the mobile breakpoint; callers must render a
 * visible HTML table/text alternative alongside it (UXD §13.4).
 */
export type AnalyticsBarDatum = {
  label: string;
  value: number;
};

export function AnalyticsBarChart({
  data,
  valueLabel = "Candidates",
}: {
  data: AnalyticsBarDatum[];
  valueLabel?: string;
}) {
  const maximum = Math.max(1, ...data.map((item) => item.value));

  return (
    <div
      aria-hidden="true"
      className="hidden space-y-2 md:block"
      data-value-label={valueLabel}
    >
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[7rem_1fr_2rem] gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {item.label}
          </span>
          <div className="flex h-5 items-center bg-muted/50">
            <div
              className="h-full bg-primary"
              style={{ width: `${(item.value / maximum) * 100}%` }}
            />
          </div>
          <span className="text-right text-xs tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
