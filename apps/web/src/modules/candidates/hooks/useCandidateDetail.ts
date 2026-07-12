import { useQuery } from "@tanstack/react-query";
import {
  getCandidateDetail,
  unwrapCandidateDetail,
} from "@/modules/candidates/api/candidates-api";

export const candidateKeys = {
  all: ["candidates"] as const,
  detail: (id: string) => [...candidateKeys.all, "detail", id] as const,
};

export function useCandidateDetail(candidateId: string | undefined) {
  return useQuery({
    queryKey: candidateKeys.detail(candidateId ?? ""),
    enabled: Boolean(candidateId),
    queryFn: async () => {
      const result = await getCandidateDetail(candidateId!);
      if (!result.ok) throw result.error;
      return unwrapCandidateDetail(result.data);
    },
  });
}
