import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getJobProgressSummary,
  listCandidateRanking,
  pollCandidateStatuses,
} from "@/modules/ranking/api/ranking-api";
import {
  allStatusesTerminal,
  fingerprintStatuses,
  type PollPhase,
  type RankingListFilter,
} from "@/modules/ranking/types";
import { recoverFromUnauthorized } from "@/modules/auth/lib/session-recovery";

export const rankingKeys = {
  all: ["ranking"] as const,
  list: (jobId: string, filter: RankingListFilter) =>
    [...rankingKeys.all, "list", jobId, filter] as const,
  progress: (jobId: string) =>
    [...rankingKeys.all, "progress", jobId] as const,
  statusPoll: (jobId: string) =>
    [...rankingKeys.all, "status-poll", jobId] as const,
};

export function useCandidateRanking(
  jobId: string | undefined,
  filter: RankingListFilter,
  enabled = true,
) {
  return useQuery({
    queryKey: rankingKeys.list(jobId ?? "", filter),
    enabled: Boolean(jobId) && enabled,
    queryFn: async () => {
      const result = await listCandidateRanking(jobId!, filter);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

export function useJobProgress(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: rankingKeys.progress(jobId ?? ""),
    enabled: Boolean(jobId) && enabled,
    queryFn: async () => {
      const result = await getJobProgressSummary(jobId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });
}

const POLL_MS = 3_000;
const BACKOFF_MS = 12_000;
const UNCHANGED_BEFORE_BACKOFF = 3;

/**
 * Screening poll — UXD §5.4.3.
 * Status poll at 3s (then backoff). Ranking refresh is NOT every tick.
 */
export function useScreeningPoll(
  jobId: string | undefined,
  options?: { enabled?: boolean; forceStart?: boolean },
) {
  const qc = useQueryClient();
  const enabled = Boolean(jobId) && options?.enabled !== false;
  const [phase, setPhase] = useState<PollPhase>("idle");
  const fingerprintRef = useRef<string>("");
  const unchangedRef = useRef(0);
  const intervalRef = useRef(POLL_MS);

  useEffect(() => {
    if (!enabled || !jobId) {
      setPhase("idle");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function tick() {
      if (cancelled || !jobId) return;

      const statusResult = await pollCandidateStatuses(jobId);
      if (!statusResult.ok) {
        const code = statusResult.error.error.code;
        if (code === "EH-AUTH") {
          setPhase("stopped");
          await recoverFromUnauthorized(
            jobId ? `/jobs/${jobId}?tab=progress` : "/dashboard",
          );
          return;
        }
        setPhase("backoff");
        intervalRef.current = BACKOFF_MS;
        timer = window.setTimeout(() => void tick(), intervalRef.current);
        return;
      }

      const rows = statusResult.data;
      const fp = fingerprintStatuses(rows);
      const terminal = allStatusesTerminal(rows);

      void qc.invalidateQueries({ queryKey: rankingKeys.progress(jobId) });

      if (fp !== fingerprintRef.current) {
        const hadPrior = fingerprintRef.current.length > 0;
        fingerprintRef.current = fp;
        unchangedRef.current = 0;
        intervalRef.current = POLL_MS;
        // Ranking refresh on terminal transition / change — not every 3s forever
        if (hadPrior) {
          void qc.invalidateQueries({ queryKey: rankingKeys.all });
        }
      } else {
        unchangedRef.current += 1;
        if (unchangedRef.current >= UNCHANGED_BEFORE_BACKOFF) {
          intervalRef.current = BACKOFF_MS;
        }
      }

      if (terminal) {
        setPhase("stopped");
        void qc.invalidateQueries({ queryKey: rankingKeys.all });
        return;
      }

      setPhase(intervalRef.current > POLL_MS ? "backoff" : "polling");
      timer = window.setTimeout(() => void tick(), intervalRef.current);
    }

    // Kick off immediately when forced (after 202) or when non-terminal likely
    setPhase("polling");
    void tick();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, jobId, qc, options?.forceStart]);

  return { phase };
}

export function useForcePollToken() {
  const [token, setToken] = useState(0);
  return {
    token,
    bump: () => setToken((n) => n + 1),
  };
}
