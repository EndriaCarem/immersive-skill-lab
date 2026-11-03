import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAccount } from "./account";
import { learnerData } from "./learning.functions";

export function useLearning() {
  const { user, ready } = useAccount();
  const fetch = useServerFn(learnerData);
  const client = useQueryClient();
  const userId = user?.id;
  const query = useQuery({ queryKey: ["learner-progress", userId], queryFn: () => fetch(), enabled: ready && Boolean(user), refetchOnWindowFocus: true });
  const refresh = useCallback(() => client.invalidateQueries({ queryKey: ["learner-progress", userId] }), [client, userId]);
  return { ...query, user, ready, refresh };
}
