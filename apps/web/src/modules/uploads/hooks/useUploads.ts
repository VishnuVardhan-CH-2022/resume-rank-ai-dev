import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCandidatesForJob,
  uploadResumeBatch,
} from "@/modules/uploads/api/upload-api";
import { jobsKeys } from "@/modules/jobs/hooks/useJobs";
import type { BatchUploadResponse } from "@/modules/uploads/types";

export const uploadsKeys = {
  all: ["uploads"] as const,
  candidates: (jobId: string) =>
    [...uploadsKeys.all, "candidates", jobId] as const,
};

export function useJobCandidates(jobId: string | undefined) {
  return useQuery({
    queryKey: uploadsKeys.candidates(jobId ?? ""),
    enabled: Boolean(jobId),
    queryFn: async () => {
      const result = await listCandidatesForJob(jobId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

export function useUploadResumes(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]): Promise<BatchUploadResponse> => {
      const result = await uploadResumeBatch(jobId, files);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: uploadsKeys.candidates(jobId) });
      void qc.invalidateQueries({ queryKey: jobsKeys.candidateCount(jobId) });
      void qc.invalidateQueries({ queryKey: jobsKeys.screenEligible(jobId) });
      void qc.invalidateQueries({ queryKey: jobsKeys.detail(jobId) });
    },
  });
}
