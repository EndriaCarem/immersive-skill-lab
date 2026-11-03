import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAccount } from "./account";
import { learnerData, runMyEvaluation } from "./learning.functions";
import { RESUME_COOLDOWN_MS, isWorking, resumableEvaluations } from "./ai-grading-rules";
import type { Submission } from "./store";

// Shared across every useLearning instance on the page, so one delivery is resumed by one request.
const lastKick = new Map<string, number>();
const inflight = new Set<string>();

/** Resumes this learner's queued or interrupted gradings from any course page while it stays open. */
function useResumeGrading(submissions: Submission[] | undefined, refresh: () => Promise<void>) {
  const kick = useServerFn(runMyEvaluation);
  const [tick, setTick] = useState(0);
  const working = Boolean(submissions?.some(s => isWorking(s.ai?.status)));
  useEffect(() => {
    if (!working) return;
    const t = window.setInterval(() => setTick(x => x + 1), RESUME_COOLDOWN_MS);
    return () => window.clearInterval(t);
  }, [working]);
  useEffect(() => {
    if (!submissions) return;
    const now = Date.now();
    for (const id of resumableEvaluations(submissions, lastKick, now)) {
      if (inflight.has(id)) continue;
      lastKick.set(id, now);
      inflight.add(id);
      kick({ data: { submissionId: id } }).catch(() => undefined).finally(() => { inflight.delete(id); void refresh(); });
    }
  }, [submissions, tick, kick, refresh]);
}

export function useLearning() {
  const { user, ready } = useAccount();
  const fetch = useServerFn(learnerData);
  const client = useQueryClient();
  const userId = user?.id;
  const query = useQuery({ queryKey: ["learner-progress", userId], queryFn: () => fetch(), enabled: ready && Boolean(user), refetchOnWindowFocus: true });
  const refresh = useCallback(() => client.invalidateQueries({ queryKey: ["learner-progress", userId] }), [client, userId]);
  useResumeGrading(query.data?.submissions, refresh);
  return { ...query, user, ready, refresh };
}
