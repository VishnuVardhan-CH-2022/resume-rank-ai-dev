import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/domain/EmptyState";
import { fetchResumeUrl } from "@/modules/screening/api/screening-api";
import { getSafeErrorMessage } from "@/lib/errors";

/**
 * ResumePreview — signed URL with refresh near expiry (ADS §6.5 / CP-25).
 */
export function ResumePreview({ candidateId }: { candidateId: string }) {
  const [filename, setFilename] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await fetchResumeUrl(candidateId);
    setLoading(false);
    if (!result.ok) {
      setError(getSafeErrorMessage(result.error));
      setUrl(null);
      return;
    }
    setUrl(result.data.signed_url);
    setFilename(result.data.original_filename);
    setExpiresAt(Date.now() + result.data.expires_in * 1000);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on candidate change
  }, [candidateId]);

  useEffect(() => {
    if (!expiresAt) return;
    const ms = Math.max(5_000, expiresAt - Date.now() - 30_000);
    const timer = window.setTimeout(() => {
      void load();
    }, ms);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Resume</h2>
      {loading && !url ? (
        <p className="text-sm text-muted-foreground">Loading signed URL…</p>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {filename ? (
        <p className="text-sm">
          File: <span className="font-medium">{filename}</span>
        </p>
      ) : null}
      {url ? (
        <Button
          variant="outline"
          render={
            <a href={url} target="_blank" rel="noreferrer noopener" />
          }
        >
          Open Resume
        </Button>
      ) : null}
    </section>
  );
}
