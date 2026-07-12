import { useId } from "react";
import type { Job } from "@/modules/jobs/types";

/**
 * JobSelector — owner-scoped filter for the Analytics dashboard.
 */
export function JobSelector({
  jobs,
  value,
  onChange,
}: {
  jobs: Job[];
  value: string;
  onChange: (jobId: string) => void;
}) {
  const id = useId();

  return (
    <label htmlFor={id} className="block text-sm">
      <span className="text-muted-foreground">Job filter</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block min-h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-80"
      >
        <option value="">Select a job for distributions</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.title}
            {job.lifecycle_status === "archived" ? " (archived)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
