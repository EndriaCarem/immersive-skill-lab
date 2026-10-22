import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ orderId: z.string().uuid() });
export const startPaymentTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((x) => input.parse(x))
  .handler(async ({ data, context }) => {
    const { startTestCheckout } = await import("./mercado-pago.server");
    return startTestCheckout(data.orderId, context.userId);
  });
export const refreshPaymentTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((x) => input.parse(x))
  .handler(async ({ data, context }) => {
    const { refreshOrderTest } = await import("./mercado-pago.server");
    return refreshOrderTest(data.orderId, context.userId);
  });