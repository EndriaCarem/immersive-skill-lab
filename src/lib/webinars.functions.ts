import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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

export type PublicWebinar = {
  id: string; slug: string; title: string; summary: string; body_html: string; speaker: string;
  video_url: string; cover_url: string; starts_at: string | null; created_at: string;
};

const cols = "id, slug, title, summary, body_html, speaker, video_url, cover_url, starts_at, created_at";

export const listPublishedWebinars = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("webinars")
    .select(cols)
    .eq("status", "published")
    .order("starts_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error("Não foi possível carregar os webinars.");
  return (data ?? []) as PublicWebinar[];
});

export const getPublishedWebinar = createServerFn({ method: "GET" })
  .inputValidator((x: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(x))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("webinars")
      .select(cols)
      .eq("status", "published")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o webinar.");
    return (row ?? null) as PublicWebinar | null;
  });

const tag = z.string().trim().max(80).regex(/^[\w\-. ]*$/u).default("");
const visitSchema = z.object({
  webinarId: z.string().uuid(),
  visitorId: z.string().uuid(),
  ref: tag,
  utmSource: tag,
  utmMedium: tag,
  utmCampaign: tag,
});

// Public, write-only tracking. Only visits to published webinars are recorded; nothing is returned.
export const trackWebinarVisit = createServerFn({ method: "POST" })
  .inputValidator((x: unknown) => visitSchema.parse(x))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin
      .from("webinars")
      .select("id")
      .eq("id", data.webinarId)
      .eq("status", "published")
      .maybeSingle();
    if (!w) return { success: false };
    const { error } = await supabaseAdmin.from("webinar_visits").insert({
      webinar_id: data.webinarId,
      visitor_id: data.visitorId,
      ref: data.ref,
      utm_source: data.utmSource,
      utm_medium: data.utmMedium,
      utm_campaign: data.utmCampaign,
    });
    return { success: !error };
  });
