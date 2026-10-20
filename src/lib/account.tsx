import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { canShowAdministration } from "@/lib/admin-access";
const AccountContext = createContext<{ user: User | null; ready: boolean; isAdmin: boolean }>({
  user: null,
  ready: false,
  isAdmin: false,
});
export function AccountProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const adminAccess = useQuery({
    queryKey: ["admin-navigation", user?.id],
    queryFn: () => canShowAdministration(user?.id),
    enabled: ready && Boolean(user),
  });
  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void router.invalidate();
        if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
        setReady(true);
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setUser(session?.user ?? null);
        setReady(true);
      }
    });
    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
        setReady(true);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, queryClient]);
  return <AccountContext.Provider value={{ user, ready, isAdmin: ready && Boolean(user) && adminAccess.data === true }}>{children}</AccountContext.Provider>;
}
export const useAccount = () => useContext(AccountContext);
