import { useMutation, useQueryClient } from "@tanstack/react-query";
import { screenJob, retryCandidate } from "@/modules/screening/api/screening-api";
import { jobsKeys } from "@/modules/jobs/hooks/useJobs";
import { uploadsKeys } from "@/modules/uploads/hooks/useUploads";

export function useScreenJob(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (candidateIds?: string[]) => {
      const result = await screenJob(jobId, { candidateIds });
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobsKeys.screenEligible(jobId) });
      void qc.invalidateQueries({ queryKey: jobsKeys.candidateCount(jobId) });
      void qc.invalidateQueries({ queryKey: uploadsKeys.candidates(jobId) });
    },
  });
}

export function useRetryCandidate(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string) => {
      const result = await retryCandidate(candidateId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobsKeys.screenEligible(jobId) });
      void qc.invalidateQueries({ queryKey: uploadsKeys.candidates(jobId) });
    },
  });
}
