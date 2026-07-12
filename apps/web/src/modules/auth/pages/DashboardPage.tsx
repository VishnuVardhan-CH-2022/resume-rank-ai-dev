import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/domain/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/modules/auth/context/AuthProvider";
import { DashboardMetricsGrid } from "@/modules/analytics/components/DashboardMetricsGrid";
import { useDashboardMetrics } from "@/modules/analytics/hooks/useAnalytics";
import { useJobsList } from "@/modules/jobs/hooks/useJobs";
import { getSafeErrorMessage } from "@/lib/errors";

/**
 * Dashboard — UXD §6.3 / AC-G08 owner-scoped metrics.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const metricsQuery = useDashboardMetrics();
  const jobsQuery = useJobsList({ filter: "all", q: "", page: 1 });
  const jobs = jobsQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome${user?.email ? `, ${user.email}` : ""}.`}
        actions={
          <Button render={<Link to="/jobs/new" />}>Create job</Button>
        }
      />

      {metricsQuery.error ? (
        <ErrorState
          message={getSafeErrorMessage(metricsQuery.error)}
          onRetry={() => void metricsQuery.refetch()}
        />
      ) : (
        <DashboardMetricsGrid
          metrics={metricsQuery.data}
          loading={metricsQuery.isLoading}
        />
      )}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-medium">Recent jobs</h2>
          <Link className="text-sm text-primary underline" to="/jobs">
            View all jobs
          </Link>
        </div>

        {jobsQuery.error ? (
          <ErrorState
            message={getSafeErrorMessage(jobsQuery.error)}
            onRetry={() => void jobsQuery.refetch()}
          />
        ) : null}

        {!jobsQuery.isLoading && !jobsQuery.error && jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            body="Create a job to start uploading and screening resumes."
          />
        ) : null}

        {jobsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading jobs…</p>
        ) : null}

        {jobs.length > 0 ? (
          <ul className="divide-y divide-border border border-border">
            {jobs.slice(0, 5).map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
              >
                <div>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="font-medium text-primary underline"
                  >
                    {job.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {job.lifecycle_status} ·{" "}
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link to={`/jobs/${job.id}`} />}
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
