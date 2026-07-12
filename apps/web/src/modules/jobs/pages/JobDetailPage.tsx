import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBanner } from "@/components/domain/ErrorBanner";
import { ProgressSummary } from "@/components/domain/ProgressSummary";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/modules/jobs/components/ConfirmDialog";
import { JobLifecycleBadge } from "@/modules/jobs/components/JobLifecycleBadge";
import {
  useArchiveJob,
  useCandidateCount,
  useDeleteJob,
  useJob,
  useScreenEligibleCount,
} from "@/modules/jobs/hooks/useJobs";
import { parseJobDetailTab, type JobDetailTab } from "@/modules/jobs/types";
import { UploadTabPanel } from "@/modules/uploads/components/UploadTabPanel";
import { ProgressTabPanel } from "@/modules/ranking/components/ProgressTabPanel";
import { CandidatesTabPanel } from "@/modules/ranking/components/CandidatesTabPanel";
import { useJobProgress } from "@/modules/ranking/hooks/useRanking";
import { useScreenJob } from "@/modules/screening/hooks/useScreening";
import { getSafeErrorMessage, type ErrorObject } from "@/lib/errors";
import { EmptyState } from "@/components/domain/EmptyState";

const TAB_ITEMS: { id: JobDetailTab; label: string; query: string | null }[] = [
  { id: "overview", label: "Overview", query: null },
  { id: "upload", label: "Upload", query: "upload" },
  { id: "progress", label: "Progress", query: "progress" },
  { id: "candidates", label: "Candidates", query: "candidates" },
  { id: "analytics", label: "Analytics", query: "analytics" },
];

export function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseJobDetailTab(searchParams.get("tab"));

  const jobQuery = useJob(jobId);
  const candidateCount = useCandidateCount(jobId);
  const eligibleCount = useScreenEligibleCount(jobId);
  const progressQuery = useJobProgress(jobId, tab === "overview");
  const archiveMutation = useArchiveJob();
  const deleteMutation = useDeleteJob();
  const screenMutation = useScreenJob(jobId ?? "");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockedDelete, setBlockedDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [screenAccepted, setScreenAccepted] = useState<number | null>(null);
  const [pollToken, setPollToken] = useState(0);

  const job = jobQuery.data;
  const archived = job?.lifecycle_status === "archived";
  const hasJd = Boolean(job?.jd_text.trim());
  const eligible = eligibleCount.data ?? 0;

  const screenDisabledReason = useMemo(() => {
    if (!job) return "Loading job…";
    if (archived) return "Archived jobs cannot be screened.";
    if (!hasJd) return "Add a job description before screening.";
    if (eligible === 0) {
      return "Upload resumes first. Start Screening is available when candidates are uploaded or queued.";
    }
    if (screenMutation.isPending) return "Submitting screening request…";
    return "Queue eligible resumes for async screening.";
  }, [job, archived, hasJd, eligible, screenMutation.isPending]);

  const screenDisabled =
    !job ||
    archived ||
    !hasJd ||
    eligible === 0 ||
    screenMutation.isPending ||
    !jobId;

  async function onStartScreening() {
    if (!jobId || screenDisabled) return;
    setActionError(null);
    setScreenAccepted(null);
    try {
      const data = await screenMutation.mutateAsync(undefined);
      setScreenAccepted(data.accepted_candidate_ids.length);
      setPollToken((n) => n + 1);
      setSearchParams({ tab: "progress" }, { replace: true });
    } catch (err) {
      setActionError(getSafeErrorMessage(err as ErrorObject));
    }
  }

  function setTab(next: JobDetailTab) {
    if (next === "overview") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: next }, { replace: true });
    }
  }

  async function confirmArchive() {
    if (!job) return;
    setActionError(null);
    try {
      await archiveMutation.mutateAsync(job.id);
      setArchiveOpen(false);
    } catch (err) {
      setActionError(getSafeErrorMessage(err as ErrorObject));
    }
  }

  async function confirmDelete() {
    if (!job) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(job.id);
      setDeleteOpen(false);
      navigate("/jobs", { replace: true });
    } catch (err) {
      const details =
        err && typeof err === "object" && "error" in err
          ? (err as ErrorObject).error.details
          : null;
      if (
        details &&
        typeof details === "object" &&
        "reason" in details &&
        details.reason === "candidates_exist"
      ) {
        setDeleteOpen(false);
        setBlockedDelete(true);
        return;
      }
      setActionError(getSafeErrorMessage(err as ErrorObject));
    }
  }

  return (
    <div>
      {jobQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading job…</p>
      ) : null}
      {jobQuery.error ? <ErrorBanner error={jobQuery.error} /> : null}
      {actionError ? <ErrorBanner error={actionError} /> : null}
      {screenAccepted != null ? (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          Processing accepted for {screenAccepted} candidate
          {screenAccepted === 1 ? "" : "s"}. Statuses move to queued while the
          worker runs.
        </p>
      ) : null}

      {job ? (
        <>
          <PageHeader
            title={job.title}
            description={`Created ${new Date(job.created_at).toLocaleString()}`}
            actions={
              <div className="flex flex-wrap gap-2">
                <JobLifecycleBadge status={job.lifecycle_status} />
                {!archived ? (
                  <Button
                    variant="outline"
                    render={<Link to={`/jobs/${job.id}/edit`} />}
                  >
                    Edit
                  </Button>
                ) : null}
                {!archived ? (
                  <Button variant="outline" onClick={() => setArchiveOpen(true)}>
                    Archive
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              </div>
            }
          />

          <p className="mb-4 text-sm text-muted-foreground">
            <Link to="/jobs" className="text-primary underline">
              ← Jobs
            </Link>
            {candidateCount.data !== undefined ? (
              <span className="ml-3">
                Candidates: {candidateCount.data}
              </span>
            ) : null}
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              disabled={screenDisabled}
              title={screenDisabledReason}
              aria-disabled={screenDisabled}
              aria-describedby="screen-disabled-reason"
              onClick={() => void onStartScreening()}
            >
              {screenMutation.isPending ? "Starting…" : "Start Screening"}
            </Button>
            <p
              id="screen-disabled-reason"
              className="text-xs text-muted-foreground"
            >
              {screenDisabledReason}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Job workspace"
            className="mb-6 flex flex-wrap gap-1 border-b border-border"
          >
            {TAB_ITEMS.map((item) => {
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={[
                    "px-3 py-2 text-sm transition-colors",
                    selected
                      ? "border-b-2 border-primary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel">
            {tab === "overview" ? (
              <section className="space-y-6">
                {progressQuery.data &&
                progressQuery.data.total_candidates > 0 ? (
                  <ProgressSummary summary={progressQuery.data} />
                ) : null}
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Job description
                  </h2>
                  <pre className="whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-relaxed">
                    {job.jd_text}
                  </pre>
                </div>
              </section>
            ) : null}

            {tab === "upload" ? (
              <UploadTabPanel jobId={job.id} archived={archived} />
            ) : null}

            {tab === "progress" ? (
              <ProgressTabPanel jobId={job.id} pollToken={pollToken} />
            ) : null}

            {tab === "candidates" ? (
              <CandidatesTabPanel
                jobId={job.id}
                jobActive={!archived}
                pollToken={pollToken}
              />
            ) : null}

            {tab === "analytics" ? (
              <EmptyState
                title="Job analytics"
                body="Job-scoped analytics charts land in Phase 11."
              />
            ) : null}
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive job?"
        description="Archiving blocks new uploads and screening. Existing data stays readable."
        confirmLabel="Archive"
        busy={archiveMutation.isPending}
        onConfirm={() => void confirmArchive()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete job permanently?"
        description="Only allowed when there are no candidates. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        busy={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={blockedDelete}
        onOpenChange={setBlockedDelete}
        title="Cannot delete"
        description="This job has candidates. Archive it instead of deleting."
        confirmLabel="Archive instead"
        onConfirm={() => {
          setBlockedDelete(false);
          setArchiveOpen(true);
        }}
      />
    </div>
  );
}
