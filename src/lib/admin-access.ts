import { supabase } from "@/integrations/supabase/client";

/** Navigation only; protected routes and server handlers still enforce access. */
export async function canShowAdministration(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !error && data === true;
}