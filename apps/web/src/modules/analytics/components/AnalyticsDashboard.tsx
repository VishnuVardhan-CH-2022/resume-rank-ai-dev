import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/domain/EmptyState";
import { getSafeErrorMessage } from "@/lib/errors";
import { DashboardMetricsGrid } from "@/modules/analytics/components/DashboardMetricsGrid";
import { JobAnalyticsContent } from "@/modules/analytics/components/JobAnalyticsContent";
import { JobSelector } from "@/modules/analytics/components/JobSelector";
import { useDashboardMetrics } from "@/modules/analytics/hooks/useAnalytics";
import { useJobsList } from "@/modules/jobs/hooks/useJobs";

/**
 * Owner-scoped Analytics dashboard — UXD §6.13.
 */
export function AnalyticsDashboard() {
  const [selectedJobId, setSelectedJobId] = useState("");
  const metricsQuery = useDashboardMetrics();
  const jobsQuery = useJobsList({ filter: "all", q: "", page: 1 });
  const jobs = jobsQuery.data ?? [];

  if (metricsQuery.isLoading || jobsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <DashboardMetricsGrid loading />
        <LoadingState label="Loading analytics…" />
      </div>
    );
  }

  if (metricsQuery.error) {
    return (
      <ErrorState
        message={getSafeErrorMessage(metricsQuery.error)}
        onRetry={() => void metricsQuery.refetch()}
      />
    );
  }

  if (jobsQuery.error) {
    return (
      <ErrorState
        message={getSafeErrorMessage(jobsQuery.error)}
        onRetry={() => void jobsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <DashboardMetricsGrid metrics={metricsQuery.data} />

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          body="Create a job and upload resumes to view analytics."
        />
      ) : (
        <section className="space-y-5">
          <JobSelector
            jobs={jobs}
            value={selectedJobId}
            onChange={setSelectedJobId}
          />

          {selectedJobId ? (
            <JobAnalyticsContent jobId={selectedJobId} />
          ) : (
            <div className="border border-dashed border-border px-6 py-10">
              <h2 className="text-base font-medium">Select a job</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a job to view status and score distributions.
              </p>
            </div>
          )}
        </section>
      )}

      {jobs.length === 0 ? (
        <Button render={<Link to="/jobs/new" />}>Create job</Button>
      ) : null}
    </div>
  );
}
