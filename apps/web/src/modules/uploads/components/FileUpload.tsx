import { useId, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ALLOWED_RESUME_MIME_TYPES, UPLOAD_MAX_BYTES } from "@/lib/storagePaths";
import { shouldWarnLargeBatch } from "@/modules/uploads/lib/validation";

const ACCEPT = [...ALLOWED_RESUME_MIME_TYPES, ".pdf", ".docx"].join(",");

type FileUploadProps = {
  disabled?: boolean;
  busy?: boolean;
  onFiles: (files: File[]) => void;
};

/**
 * FileUpload — UXD catalog name (RR-UXD-007 §7 / §8.3).
 * Drag optional; click required. PDF/DOCX ≤5 MB.
 */
export function FileUpload({ disabled, busy, onFiles }: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const inactive = Boolean(disabled || busy);

  function takeFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    setPendingCount(files.length);
    onFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (inactive) return;
    takeFiles(e.dataTransfer.files);
  }

  const maxMb = Math.round(UPLOAD_MAX_BYTES / (1024 * 1024));
  const showBatchWarning = shouldWarnLargeBatch(pendingCount);

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-labelledby={`${inputId}-label`}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!inactive) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "flex w-full flex-col items-start gap-3 border border-dashed px-4 py-8 transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20",
          inactive ? "opacity-60" : "",
        ].join(" ")}
      >
        <p id={`${inputId}-label`} className="text-sm font-medium">
          Upload resumes
        </p>
        <p className="text-sm text-muted-foreground">
          PDF or DOCX only, up to {maxMb} MB each. Files stay as{" "}
          <span className="text-foreground">uploaded</span> until you Start
          Screening.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={inactive}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Choose files"}
          </Button>
          <span className="text-xs text-muted-foreground">
            or drag and drop here
          </span>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={ACCEPT}
          multiple
          disabled={inactive}
          onChange={(e) => takeFiles(e.target.files)}
        />
      </div>

      {showBatchWarning ? (
        <Alert>
          <AlertTitle>Large batch</AlertTitle>
          <AlertDescription>
            You selected {pendingCount} files. Processing may take longer after
            you Start Screening.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
