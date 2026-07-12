/**
 * Job types — RR-DB-005 §5.2 / RR-API-006 §15.1
 */

export type JobLifecycleStatus = "active" | "archived";

export type Job = {
  id: string;
  owner_user_id: string;
  title: string;
  jd_text: string;
  lifecycle_status: JobLifecycleStatus;
  created_at: string;
  updated_at: string;
};

export type CreateJobInput = {
  title: string;
  jd_text: string;
};

export type UpdateJobInput = {
  title?: string;
  jd_text?: string;
};

export type JobListFilter = "active" | "archived" | "all";

export const JOB_DETAIL_TABS = [
  "overview",
  "upload",
  "progress",
  "candidates",
  "analytics",
] as const;

export type JobDetailTab = (typeof JOB_DETAIL_TABS)[number];

export function parseJobDetailTab(raw: string | null): JobDetailTab {
  if (
    raw === "upload" ||
    raw === "progress" ||
    raw === "candidates" ||
    raw === "analytics"
  ) {
    return raw;
  }
  return "overview";
}
