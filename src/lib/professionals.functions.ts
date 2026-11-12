import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { courseFaculty, visiblePeople, type Professional } from "./professionals";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const shim = (input: RequestInfo | URL, init?: RequestInit) => {
    const h = new Headers(init?.headers);
    if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
    h.set("apikey", key);
    return fetch(input, { ...init, headers: h });
  };
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(key.startsWith("sb_") ? { global: { fetch: shim } } : {}),
  });
}

/** Public: professionals linked to a course that are active and authorized for display. */
export const getCourseFaculty = createServerFn({ method: "GET" })
  .inputValidator((x: unknown) => z.object({ programId: z.string().min(1).max(80) }).parse(x))
  .handler(async ({ data }): Promise<Professional[]> => {
    const db = publicClient();
    const links = await db.from("learning_course_professionals").select("professional_id, is_lead, position").eq("program_id", data.programId);
    if (links.error) throw new Error("Não foi possível carregar os professores.");
    const ids = (links.data ?? []).map((l) => l.professional_id);
    if (!ids.length) return [];
    const people = await db
      .from("learning_professionals")
      .select("id, full_name, title, specialty, bio, photo_path, active, display_authorized")
      .in("id", ids);
    if (people.error) throw new Error("Não foi possível carregar os professores.");
    const paths = (people.data ?? []).filter((p) => p.active && p.display_authorized).map((p) => p.photo_path).filter((p): p is string => Boolean(p));
    const urls = new Map<string, string>();
    if (paths.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const signed = await supabaseAdmin.storage.from("professional-photos").createSignedUrls(paths, 3600);
      for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
    }
    return courseFaculty(links.data ?? [], visiblePeople(people.data ?? [], urls));
  });
