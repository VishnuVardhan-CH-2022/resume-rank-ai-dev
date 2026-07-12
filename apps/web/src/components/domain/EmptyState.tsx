export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border border-dashed border-border px-6 py-10">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="text-sm text-muted-foreground" aria-busy="true">
      {label}
    </p>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-2 underline"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
