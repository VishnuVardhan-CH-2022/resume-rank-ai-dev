import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveJob,
  countCandidatesForJob,
  countScreenEligibleCandidates,
  createJob,
  deleteJobIfEmpty,
  getJob,
  listJobs,
  updateJob,
} from "@/modules/jobs/api/jobs-api";
import { analyticsKeys } from "@/modules/analytics/hooks/useAnalytics";
import type {
  CreateJobInput,
  JobListFilter,
  UpdateJobInput,
} from "@/modules/jobs/types";

export const jobsKeys = {
  all: ["jobs"] as const,
  list: (filter: JobListFilter, q: string, page: number) =>
    [...jobsKeys.all, "list", filter, q, page] as const,
  detail: (id: string) => [...jobsKeys.all, "detail", id] as const,
  candidateCount: (id: string) =>
    [...jobsKeys.all, "candidate-count", id] as const,
  screenEligible: (id: string) =>
    [...jobsKeys.all, "screen-eligible", id] as const,
};

export function useJobsList(options: {
  filter: JobListFilter;
  q: string;
  page: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: jobsKeys.list(options.filter, options.q, options.page),
    enabled: options.enabled !== false,
    queryFn: async () => {
      const result = await listJobs({
        filter: options.filter,
        q: options.q,
        page: options.page,
      });
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: jobsKeys.detail(jobId ?? ""),
    enabled: Boolean(jobId),
    queryFn: async () => {
      const result = await getJob(jobId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

export function useCandidateCount(jobId: string | undefined) {
  return useQuery({
    queryKey: jobsKeys.candidateCount(jobId ?? ""),
    enabled: Boolean(jobId),
    queryFn: async () => {
      const result = await countCandidatesForJob(jobId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

export function useScreenEligibleCount(jobId: string | undefined) {
  return useQuery({
    queryKey: jobsKeys.screenEligible(jobId ?? ""),
    enabled: Boolean(jobId),
    queryFn: async () => {
      const result = await countScreenEligibleCandidates(jobId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      const result = await createJob(input);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobsKeys.all });
      void qc.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}

export function useUpdateJob(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateJobInput) => {
      const result = await updateJob(jobId, input);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: (job) => {
      void qc.invalidateQueries({ queryKey: jobsKeys.all });
      qc.setQueryData(jobsKeys.detail(jobId), job);
    },
  });
}

export function useArchiveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const result = await archiveJob(jobId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: (job) => {
      void qc.invalidateQueries({ queryKey: jobsKeys.all });
      void qc.invalidateQueries({ queryKey: analyticsKeys.all });
      qc.setQueryData(jobsKeys.detail(job.id), job);
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const result = await deleteJobIfEmpty(jobId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobsKeys.all });
      void qc.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}
