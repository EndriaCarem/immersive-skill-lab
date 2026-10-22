import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { directPaymentSchema } from "./mercado-pago-rules";

const input = z.object({ orderId: z.string().uuid() });

/** Public key is publishable; card data is tokenized in the browser and never reaches our server. */
export const getPaymentConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ publicKey: process.env["MERCADO_PAGO_TEST_PUBLIC_KEY"] ?? null }));

export const payTestOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((x) => directPaymentSchema.parse(x))
  .handler(async ({ data, context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email : "";
    if (!email) throw new Error("Sua conta precisa de um e-mail para pagar.");
    const { createDirectTestPayment } = await import("./mercado-pago.server");
    return createDirectTestPayment(data, context.userId, email);
  });

export const refreshPaymentTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((x) => input.parse(x))
  .handler(async ({ data, context }) => {
    const { refreshOrderTest } = await import("./mercado-pago.server");
    return refreshOrderTest(data.orderId, context.userId);
  });
