import { z } from "zod";

export const MP_TEST_WEBHOOK_PATH = "/api/public/mercado-pago";
export const paymentIdSchema = z.string().regex(/^\d{1,30}$/);
export const paymentSchema = z.object({
  id: z.number().int().positive(),
  external_reference: z.string(),
  collector_id: z.number().int().positive(),
  currency_id: z.string(),
  transaction_amount: z.number().positive(),
  live_mode: z.boolean(),
  status: z.enum(["pending", "approved", "rejected", "cancelled", "refunded", "charged_back", "in_process", "in_mediation", "authorized"]),
  payment_type_id: z.string(),
  payment_method_id: z.string(),
  installments: z.number().int(),
  date_last_updated: z.string().datetime({ offset: true }),
});

export function matchesTestPayment(payment: z.infer<typeof paymentSchema>, expected: {
  id: string; amount_cents: number; method: string; installments: number;
}, sellerId: number) {
  // Test checkout offers every method, so the buyer may pick a different one than the order.
  return !payment.live_mode && payment.collector_id === sellerId &&
    payment.external_reference === `empiria-test:${expected.id}` && payment.currency_id === "BRL" &&
    Math.round(payment.transaction_amount * 100) === expected.amount_cents &&
    payment.installments >= 1 && payment.installments <= 6;
}

export function excludedMethods(methods: { id: string; payment_type_id: string; status: string }[], method: string) {
  // Mercado Pago rejects excluding account_money (400); ids are deduplicated.
  const ids = methods.filter((m) => m.status === "active" && m.id !== "account_money" && !(method === "pix" ? m.id === "pix"
    : method === "boleto" ? m.payment_type_id === "ticket" : m.payment_type_id === "credit_card"))
    .map((m) => m.id);
  return [...new Set(ids)].map((id) => ({ id }));
}

export async function verifyMpSignature(headers: Headers, id: string, secret: string, now = Date.now()) {
  const requestId = headers.get("x-request-id");
  const parts = new Map((headers.get("x-signature") ?? "").split(",").map((part) => {
    const [key, value] = part.trim().split("="); return [key, value];
  }));
  const ts = parts.get("ts");
  const signature = parts.get("v1");
  if (!requestId || !ts || !/^\d{10,13}$/.test(ts) || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const timestamp = ts.length === 13 ? Number(ts) : Number(ts) * 1000;
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(signature.match(/.{2}/g) ?? [], (x) => parseInt(x, 16));
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`));
}

export const testPaymentLabel: Record<string, string> = {
  creating: "Preparando teste", ready: "Pronto para testar", approved: "Teste aprovado",
  pending: "Teste pendente", in_process: "Teste em análise", rejected: "Teste recusado",
  cancelled: "Teste cancelado", refunded: "Teste reembolsado", charged_back: "Teste contestado",
  in_mediation: "Teste em mediação", authorized: "Teste autorizado",
};