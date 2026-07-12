import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * StatCard — UXD catalog for concise, textual metric display.
 */
export function StatCard({
  label,
  value,
  description,
  loading = false,
}: {
  label: string;
  value: string | number;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card size="sm" aria-busy={loading || undefined}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {loading ? "—" : value}
        </CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="text-xs text-muted-foreground">
          {description}
        </CardContent>
      ) : null}
    </Card>
  );
}
