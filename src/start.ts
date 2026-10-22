import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { isSiteAccessPublicPath } from "@/lib/site-access";

const siteAccessMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (isSiteAccessPublicPath(url.pathname)) return next();
  const { siteAccessSession } = await import("@/lib/site-access.server");
  const session = await siteAccessSession();
  if (session.data.unlocked === true) return next();
  if (url.pathname.startsWith("/api/") || request.headers.get("accept")?.includes("application/json")) {
    return Response.json({ error: "Restricted access required" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const destination = new URL("/acesso-restrito", url.origin);
  destination.searchParams.set("returnTo", url.pathname + url.search);
  return new Response(null, { status: 302, headers: { location: destination.toString(), "cache-control": "no-store" } });
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware, siteAccessMiddleware],
}));
