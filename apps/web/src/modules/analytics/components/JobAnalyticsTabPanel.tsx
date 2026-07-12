import { JobAnalyticsContent } from "@/modules/analytics/components/JobAnalyticsContent";

/**
 * Job Details Analytics tab — UXD §6.0 / FR-036 Should.
 */
export function JobAnalyticsTabPanel({ jobId }: { jobId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium">Job analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only distributions and progress for this job.
        </p>
      </div>
      <JobAnalyticsContent jobId={jobId} />
    </div>
  );
}
