import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBanner } from "@/components/domain/ErrorBanner";
import { JobForm } from "@/modules/jobs/components/JobForm";
import { useCreateJob } from "@/modules/jobs/hooks/useJobs";
import { getSafeErrorMessage, type ErrorObject } from "@/lib/errors";

export function JobCreatePage() {
  const navigate = useNavigate();
  const createJob = useCreateJob();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Create job"
        description="Add a title and job description to begin screening."
      />
      <p className="mb-4 text-sm text-muted-foreground">
        <Link to="/jobs" className="text-primary underline">
          ← Back to jobs
        </Link>
      </p>

      {error ? <ErrorBanner error={error} /> : null}

      <JobForm
        submitLabel="Save job"
        busy={createJob.isPending}
        onCancel={() => navigate("/jobs")}
        onSubmit={async (values) => {
          setError(null);
          try {
            const job = await createJob.mutateAsync(values);
            navigate(`/jobs/${job.id}`, { replace: true });
          } catch (err) {
            setError(getSafeErrorMessage(err as ErrorObject));
          }
        }}
      />
    </div>
  );
}
