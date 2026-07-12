import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

export function JobDetailPage() {
  const { jobId } = useParams();

  return (
    <div>
      <PageHeader
        title="Job detail"
        description={`Job id: ${jobId ?? "unknown"} — tabs and screening actions come later.`}
      />
      <p className="text-sm text-muted-foreground">
        Placeholder for uploads, ranking, and screening controls.
      </p>
      <Link
        to={`/jobs/${jobId}/candidates/demo`}
        className="mt-4 inline-block text-sm text-primary underline"
      >
        Open sample candidate route
      </Link>
    </div>
  );
}
