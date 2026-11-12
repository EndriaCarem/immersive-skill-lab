import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { isInternalHost, isTracked, sectionOf } from "./journey";

const tag = z.string().trim().max(120).regex(/^[\w\-. /]*$/u).default("");
const visitSchema = z.object({
  visitorId: z.string().uuid(),
  path: z.string().trim().min(1).max(300).regex(/^\/[\w\-./%]*$/u),
  referrerHost: tag, source: tag, medium: tag, campaign: tag,
  landing: z.string().trim().max(300).regex(/^\/?[\w\-./%]*$/u).default(""),
  device: z.enum(["desktop", "mobile", "tablet", ""]).default(""),
});

/** Public, write-only page-visit log. The account is taken from the verified session token, never from the client. */
export const trackPageVisit = createServerFn({ method: "POST" })
  .inputValidator((x: unknown) => visitSchema.parse(x))
  .handler(async ({ data }) => {
    if (!isTracked(data.path) || isInternalHost(data.source) || isInternalHost(data.referrerHost)) return { success: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId: string | null = null;
    const auth = getRequest()?.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) {
      const { data: u } = await supabaseAdmin.auth.getUser(token);
      userId = u.user?.id ?? null;
    }
    const { error } = await supabaseAdmin.from("site_page_visits").insert({
      visitor_id: data.visitorId, user_id: userId, path: data.path, section: sectionOf(data.path),
      referrer_host: data.referrerHost, first_source: data.source, first_medium: data.medium,
      first_campaign: data.campaign, first_landing: data.landing, device: data.device,
    });
    return { success: !error };
  });
