import { useQuery } from "@tanstack/react-query";
import {
  getDashboardMetrics,
  getScoreDistribution,
  getScreeningStatistics,
} from "@/modules/analytics/api/analytics-api";

export const analyticsKeys = {
  all: ["analytics"] as const,
  dashboard: () => [...analyticsKeys.all, "dashboard"] as const,
  jobStats: (jobId: string) =>
    [...analyticsKeys.all, "job-stats", jobId] as const,
  scoreDistribution: (jobId: string) =>
    [...analyticsKeys.all, "score-distribution", jobId] as const,
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: async () => {
      const result = await getDashboardMetrics();
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

export function useJobScreeningStatistics(
  jobId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.jobStats(jobId ?? ""),
    enabled: Boolean(jobId) && enabled,
    queryFn: async () => {
      const result = await getScreeningStatistics(jobId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

export function useScoreDistribution(
  jobId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.scoreDistribution(jobId ?? ""),
    enabled: Boolean(jobId) && enabled,
    queryFn: async () => {
      const result = await getScoreDistribution(jobId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}
