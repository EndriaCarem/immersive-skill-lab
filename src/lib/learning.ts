import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAccount } from "./account";
import { learnerData } from "./learning.functions";

export function useLearning() {
  const { user, ready } = useAccount();
  const fetch = useServerFn(learnerData);
  const client = useQueryClient();
  const queryKey = ["learner-progress", user?.id];
  const query = useQuery({ queryKey, queryFn: () => fetch(), enabled: ready && Boolean(user), refetchOnWindowFocus: true });
  return { ...query, user, ready, refresh: () => client.invalidateQueries({ queryKey }) };
}