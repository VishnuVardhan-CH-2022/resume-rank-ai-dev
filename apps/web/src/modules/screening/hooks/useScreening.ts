import { useMutation, useQueryClient } from "@tanstack/react-query";
import { screenJob, retryCandidate } from "@/modules/screening/api/screening-api";
import { analyticsKeys } from "@/modules/analytics/hooks/useAnalytics";
import { jobsKeys } from "@/modules/jobs/hooks/useJobs";
import { uploadsKeys } from "@/modules/uploads/hooks/useUploads";
import { rankingKeys } from "@/modules/ranking/hooks/useRanking";
import { candidateKeys } from "@/modules/candidates/hooks/useCandidateDetail";

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
      void qc.invalidateQueries({ queryKey: rankingKeys.all });
      void qc.invalidateQueries({ queryKey: analyticsKeys.all });
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
    onSuccess: (_data, candidateId) => {
      void qc.invalidateQueries({ queryKey: jobsKeys.screenEligible(jobId) });
      void qc.invalidateQueries({ queryKey: uploadsKeys.candidates(jobId) });
      void qc.invalidateQueries({ queryKey: rankingKeys.all });
      void qc.invalidateQueries({ queryKey: analyticsKeys.all });
      void qc.invalidateQueries({
        queryKey: candidateKeys.detail(candidateId),
      });
    },
  });
}
