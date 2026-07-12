import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBanner } from "@/components/domain/ErrorBanner";
import { JobForm } from "@/modules/jobs/components/JobForm";
import { useJob, useUpdateJob } from "@/modules/jobs/hooks/useJobs";
import { getSafeErrorMessage, type ErrorObject } from "@/lib/errors";

export function JobEditPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const jobQuery = useJob(jobId);
  const updateJob = useUpdateJob(jobId ?? "");
  const [error, setError] = useState<string | null>(null);

  const job = jobQuery.data;
  const archived = job?.lifecycle_status === "archived";

  return (
    <div>
      <PageHeader
        title="Edit job"
        description={
          archived
            ? "Archived jobs are read-only."
            : "Update title or job description."
        }
      />
      <p className="mb-4 text-sm text-muted-foreground">
        <Link to="/jobs" className="text-primary underline">
          Jobs
        </Link>
        {" / "}
        {jobId ? (
          <Link to={`/jobs/${jobId}`} className="text-primary underline">
            {job?.title ?? "Job"}
          </Link>
        ) : null}
        {" / Edit"}
      </p>

      {jobQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}
      {jobQuery.error ? <ErrorBanner error={jobQuery.error} /> : null}
      {error ? <ErrorBanner error={error} /> : null}
      {archived ? (
        <ErrorBanner
          error={{
            error: {
              code: "EH-FORB",
              message: "This job is archived and cannot be edited.",
            },
          }}
        />
      ) : null}

      {job ? (
        <JobForm
          key={job.id}
          initialTitle={job.title}
          initialJdText={job.jd_text}
          submitLabel="Save changes"
          readOnly={archived}
          busy={updateJob.isPending}
          onCancel={() => navigate(`/jobs/${job.id}`)}
          onSubmit={async (values) => {
            setError(null);
            try {
              await updateJob.mutateAsync(values);
              navigate(`/jobs/${job.id}`, { replace: true });
            } catch (err) {
              setError(getSafeErrorMessage(err as ErrorObject));
            }
          }}
        />
      ) : null}
    </div>
  );
}
