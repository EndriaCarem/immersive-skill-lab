import { createFileRoute } from "@tanstack/react-router";
import { paymentIdSchema, verifyMpSignature } from "@/lib/mercado-pago-rules";

export const Route = createFileRoute("/api/public/mercado-pago")({
  server: { handlers: { POST: async ({ request }) => {
    const secret = process.env["MERCADO_PAGO_TEST_WEBHOOK_SECRET"];
    if (!secret) return new Response("Notifications not configured", { status: 503 });
    const url = new URL(request.url);
    const id = paymentIdSchema.safeParse(url.searchParams.get("data.id"));
    if (!id.success || !(await verifyMpSignature(request.headers, id.data, secret))) return new Response("Invalid signature", { status: 401 });
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 16384) return new Response("Payload too large", { status: 413 });
    const text = await request.text();
    if (text.length > 16384) return new Response("Payload too large", { status: 413 });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return new Response("Invalid payload", { status: 400 }); }
    const { z } = await import("zod");
    const parsed = z.object({ type: z.literal("payment"), data: z.object({ id: z.union([z.string(), z.number()]).transform(String) }) }).safeParse(body);
    if (!parsed.success || parsed.data.data.id !== id.data) return new Response("Invalid notification", { status: 400 });
    try {
      const { reconcileTestPayment } = await import("@/lib/mercado-pago.server");
      await reconcileTestPayment(id.data);
      return new Response("ok");
    } catch {
      return new Response("Unable to reconcile notification", { status: 502 });
    }
  } } },
});