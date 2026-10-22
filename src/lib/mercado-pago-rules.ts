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

export const paymentReference = (id: string, live: boolean) => `${live ? "empiria" : "empiria-test"}:${id}`;
export const referenceAttemptId = (ref: string) => ref.replace(/^empiria(-test)?:/, "");

export function matchesTestPayment(payment: z.infer<typeof paymentSchema>, expected: {
  id: string; amount_cents: number; method: string; installments: number; live?: boolean;
}, sellerId: number) {
  const live = expected.live === true;
  return payment.live_mode === live && payment.collector_id === sellerId &&
    payment.external_reference === paymentReference(expected.id, live) && payment.currency_id === "BRL" &&
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
  creating: "Preparando pagamento", ready: "Aguardando pagamento", approved: "Pagamento aprovado",
  pending: "Pagamento pendente", in_process: "Pagamento em análise", rejected: "Pagamento recusado",
  cancelled: "Pagamento cancelado", refunded: "Pagamento reembolsado", charged_back: "Pagamento contestado",
  in_mediation: "Pagamento em mediação", authorized: "Pagamento autorizado",
};
const cpf = z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().length(11, "CPF deve ter 11 dígitos."));
export const directPaymentSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("pix"), orderId: z.string().uuid() }),
  z.object({
    method: z.literal("boleto"), orderId: z.string().uuid(),
    payer: z.object({
      firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60), cpf,
      zip: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().length(8, "CEP deve ter 8 dígitos.")),
      street: z.string().trim().min(1).max(120), number: z.string().trim().min(1).max(20),
      neighborhood: z.string().trim().min(1).max(80), city: z.string().trim().min(1).max(80),
      uf: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "UF inválida."),
    }),
  }),
  z.object({
    method: z.literal("card"), orderId: z.string().uuid(),
    token: z.string().min(8).max(200), paymentMethodId: z.string().min(2).max(40),
    issuerId: z.union([z.string(), z.number()]).transform(String).optional(),
    installments: z.number().int().min(1).max(6),
    payerEmail: z.string().email().max(200),
    identification: z.object({ type: z.string().max(10), number: z.string().max(20) }).optional(),
  }),
]);
export type DirectPayment = z.infer<typeof directPaymentSchema>;

/** Builds the Mercado Pago /v1/payments body. Amount always comes from the server-side order. */
export function buildPaymentBody(input: DirectPayment, ctx: { attemptId: string; amountCents: number; email: string; notificationUrl: string; live?: boolean }) {
  const base = {
    transaction_amount: ctx.amountCents / 100,
    description: ctx.live ? "Empiria — matrícula" : "Empiria — teste de matrícula",
    external_reference: paymentReference(ctx.attemptId, ctx.live === true),
    notification_url: ctx.notificationUrl,
    statement_descriptor: ctx.live ? "EMPIRIA" : "EMPIRIA TESTE",
  };
  if (input.method === "pix") return { ...base, payment_method_id: "pix", payer: { email: ctx.email } };
  if (input.method === "boleto") {
    const p = input.payer;
    return { ...base, payment_method_id: "bolbradesco", payer: {
      email: ctx.email, first_name: p.firstName, last_name: p.lastName,
      identification: { type: "CPF", number: p.cpf },
      address: { zip_code: p.zip, street_name: p.street, street_number: p.number, neighborhood: p.neighborhood, city: p.city, federal_unit: p.uf },
    } };
  }
  return { ...base, token: input.token, installments: input.installments, payment_method_id: input.paymentMethodId,
    ...(input.issuerId ? { issuer_id: Number(input.issuerId) } : {}),
    payer: { email: input.payerEmail, ...(input.identification ? { identification: input.identification } : {}) } };
}

export const paymentViewSchema = paymentSchema.extend({
  status_detail: z.string().nullish(),
  point_of_interaction: z.object({ transaction_data: z.object({
    qr_code: z.string().nullish(), qr_code_base64: z.string().nullish(), ticket_url: z.string().nullish(),
  }).partial().nullish() }).partial().nullish(),
  transaction_details: z.object({ external_resource_url: z.string().nullish() }).partial().nullish(),
  barcode: z.object({ content: z.string().nullish() }).partial().nullish(),
});
export function paymentView(p: z.infer<typeof paymentViewSchema>) {
  const td = p.point_of_interaction?.transaction_data;
  return {
    paymentId: String(p.id), status: p.status, statusDetail: p.status_detail ?? null, method: p.payment_type_id,
    pixCode: td?.qr_code ?? null, pixQrBase64: td?.qr_code_base64 ?? null,
    boletoUrl: p.transaction_details?.external_resource_url ?? td?.ticket_url ?? null,
    boletoBarcode: p.barcode?.content ?? null,
  };
}
export type PaymentView = ReturnType<typeof paymentView>;
