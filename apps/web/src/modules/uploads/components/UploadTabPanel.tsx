import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/domain/ErrorBanner";
import { FileUpload } from "@/modules/uploads/components/FileUpload";
import { FileList } from "@/modules/uploads/components/FileList";
import {
  useJobCandidates,
  useUploadResumes,
} from "@/modules/uploads/hooks/useUploads";
import type { UploadFileResult } from "@/modules/uploads/types";
import { getSafeErrorMessage, type ErrorObject } from "@/lib/errors";

type UploadTabPanelProps = {
  jobId: string;
  archived: boolean;
};

/**
 * Job Details Upload tab — UXD §6.8.
 * Persist only; never auto-starts screening.
 */
export function UploadTabPanel({ jobId, archived }: UploadTabPanelProps) {
  const candidatesQuery = useJobCandidates(jobId);
  const uploadMutation = useUploadResumes(jobId);
  const [batchResults, setBatchResults] = useState<UploadFileResult[] | null>(
    null,
  );
  const [successBanner, setSuccessBanner] = useState(false);

  async function handleFiles(files: File[]) {
    setSuccessBanner(false);
    setBatchResults(null);
    try {
      const data = await uploadMutation.mutateAsync(files);
      setBatchResults(data.results);
      const anyOk = data.results.some((r) => r.ok);
      setSuccessBanner(anyOk);
    } catch (err) {
      setBatchResults(null);
      setSuccessBanner(false);
      // ErrorBanner below via mutation.error
      void err;
    }
  }

  const mutationError =
    uploadMutation.error != null
      ? getSafeErrorMessage(uploadMutation.error as unknown as ErrorObject)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium">Upload resumes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Files are stored with status uploaded. Review the list, then use Start
          Screening when ready — upload never enqueues AI work.
        </p>
      </div>

      {archived ? (
        <Alert variant="destructive">
          <AlertTitle>Archived job</AlertTitle>
          <AlertDescription>
            This job is archived. New uploads are blocked.
          </AlertDescription>
        </Alert>
      ) : (
        <FileUpload
          disabled={archived}
          busy={uploadMutation.isPending}
          onFiles={(files) => void handleFiles(files)}
        />
      )}

      {mutationError ? <ErrorBanner error={mutationError} /> : null}
      {candidatesQuery.error ? (
        <ErrorBanner error={candidatesQuery.error} />
      ) : null}

      {successBanner ? (
        <Alert>
          <AlertTitle>Upload complete</AlertTitle>
          <AlertDescription>
            Review candidates, then Start Screening.{" "}
            <Button
              variant="link"
              className="h-auto p-0"
              render={<Link to={`/jobs/${jobId}?tab=candidates`} />}
            >
              Open Candidates tab
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {uploadMutation.isPending ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Uploading files…
        </p>
      ) : null}

      <FileList
        candidates={candidatesQuery.data ?? []}
        batchResults={batchResults}
        emptyMessage={
          archived
            ? "No resumes on this archived job."
            : "Drop PDF or DOCX files above to get started."
        }
      />
    </div>
  );
}
