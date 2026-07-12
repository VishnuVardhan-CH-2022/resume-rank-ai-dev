import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBanner } from "@/components/domain/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/modules/auth/context/AuthProvider";
import { ConfirmDialog } from "@/modules/jobs/components/ConfirmDialog";
import { JobLifecycleBadge } from "@/modules/jobs/components/JobLifecycleBadge";
import {
  useArchiveJob,
  useDeleteJob,
  useJobsList,
} from "@/modules/jobs/hooks/useJobs";
import type { Job, JobListFilter } from "@/modules/jobs/types";
import { getSafeErrorMessage, type ErrorObject } from "@/lib/errors";

export function JobsListPage() {
  const { configured } = useAuth();
  const [filter, setFilter] = useState<JobListFilter>("active");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<Job | null>(null);

  const list = useJobsList({
    filter,
    q: search,
    page,
    enabled: configured,
  });
  const archiveMutation = useArchiveJob();
  const deleteMutation = useDeleteJob();

  const jobs = list.data ?? [];
  const empty = !list.isLoading && jobs.length === 0;

  const emptyCopy = useMemo(() => {
    if (search) return "No jobs match your search.";
    if (filter === "archived") return "No archived jobs.";
    return "No jobs yet. Create a job to get started.";
  }, [filter, search]);

  async function confirmArchive() {
    if (!archiveTarget) return;
    setActionError(null);
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
      setArchiveTarget(null);
    } catch (err) {
      setActionError(getSafeErrorMessage(err as ErrorObject));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
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
        setBlockedDelete(deleteTarget);
        setDeleteTarget(null);
        return;
      }
      setActionError(getSafeErrorMessage(err as ErrorObject));
    }
  }

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Create and manage job openings."
        actions={
          <Button render={<Link to="/jobs/new" />}>Create job</Button>
        }
      />

      {!configured ? (
        <ErrorBanner
          error={{
            error: {
              code: "EH-SYS",
              message: "Supabase is not configured. Set VITE_* env keys.",
            },
          }}
        />
      ) : null}

      {list.error ? <ErrorBanner error={list.error} /> : null}
      {actionError ? <ErrorBanner error={actionError} /> : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="job-filter">
            Lifecycle
          </label>
          <select
            id="job-filter"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as JobListFilter);
              setPage(1);
            }}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="job-q">
            Search
          </label>
          <div className="flex gap-2">
            <Input
              id="job-q"
              value={q}
              maxLength={200}
              placeholder="Search by title"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(q.trim());
                  setPage(1);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch(q.trim());
                setPage(1);
              }}
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading jobs…</p>
      ) : empty ? (
        <div className="rounded-md border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyCopy}</p>
          {filter === "active" && !search ? (
            <Button className="mt-4" render={<Link to="/jobs/new" />}>
              Create job
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-2">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <JobLifecycleBadge status={job.lifecycle_status} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link to={`/jobs/${job.id}`} />}
                      >
                        Open
                      </Button>
                      {job.lifecycle_status === "active" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            render={<Link to={`/jobs/${job.id}/edit`} />}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setArchiveTarget(job)}
                          >
                            Archive
                          </Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(job)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={jobs.length < 20}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive job?"
        description="Archiving blocks new uploads and screening. Existing candidates and rankings stay readable."
        confirmLabel="Archive"
        busy={archiveMutation.isPending}
        onConfirm={() => void confirmArchive()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete job permanently?"
        description="Only allowed when there are no candidates. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        busy={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={Boolean(blockedDelete)}
        onOpenChange={(open) => !open && setBlockedDelete(null)}
        title="Cannot delete"
        description="This job has candidates. Archive it instead of deleting."
        confirmLabel="Archive instead"
        busy={archiveMutation.isPending}
        onConfirm={() => {
          if (!blockedDelete) return;
          setArchiveTarget(blockedDelete);
          setBlockedDelete(null);
        }}
      />
    </div>
  );
}
