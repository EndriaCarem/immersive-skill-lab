import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/acesso-restrito")({
  server: { handlers: {
    GET: async () => {
      const { siteAccessSession } = await import("@/lib/site-access.server");
      const session = await siteAccessSession();
      return Response.json({ unlocked: session.data.unlocked === true }, { headers: { "cache-control": "no-store" } });
    },
    POST: async ({ request }) => {
      const origin = request.headers.get("origin");
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
      let originHost = "";
      try { originHost = origin ? new URL(origin).host : ""; } catch { originHost = ""; }
      if (!originHost || originHost !== host) return new Response(null, { status: 403 });
      const input = z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(128) }).safeParse(await request.json().catch(() => null));
      const { siteAccessSession, verifySiteCredentials } = await import("@/lib/site-access.server");
      if (!input.success || !verifySiteCredentials(input.data.username, input.data.password)) {
        return Response.json({ ok: false }, { status: 401, headers: { "cache-control": "no-store" } });
      }
      const session = await siteAccessSession();
      await session.update({ unlocked: true });
      return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
    },
  } },
});