import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

export function CandidateDetailPage() {
  const { jobId, candidateId } = useParams();

  return (
    <div>
      <PageHeader
        title="Candidate detail"
        description={`Job ${jobId ?? "—"} · Candidate ${candidateId ?? "—"}`}
      />
      <p className="text-sm text-muted-foreground">
        Placeholder for score breakdown and resume preview.
      </p>
    </div>
  );
}
