import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildPaymentBody, paymentReference, referenceAttemptId, matchesTestPayment, paymentIdSchema, paymentView, paymentViewSchema, MP_TEST_WEBHOOK_PATH, type DirectPayment, type PaymentView } from "./mercado-pago-rules";

const MP_API = "https://api.mercadopago.com";
// Production is intentionally unavailable until test checkout is accepted.
const RETURN_ORIGIN = "https://empiria-law.com";

async function mpRequest(path: string, init?: RequestInit) {
  const token = process.env["MERCADO_PAGO_ACCESS_TOKEN"] || process.env["MERCADO_PAGO_TEST_ACCESS_TOKEN"];
  if (!token) throw new Error("Mercado Pago ainda não configurado.");
  const response = await fetch(`${MP_API}${path}`, {
    ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    // Log only provider error codes/descriptions, never the full body (may echo personal data).
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string; error?: string; cause?: { code?: unknown; description?: string }[] };
      const causes = (body.cause ?? []).map((c) => `${c.code ?? ""} ${c.description ?? ""}`.trim()).filter(Boolean).join("; ");
      detail = [body.error, body.message, causes].filter(Boolean).join(" | ").slice(0, 400);
    } catch { /* non-JSON body */ }
    console.error("[MercadoPago] request failed", { path: path.split("?")[0], status: response.status, detail });
    throw new Error(`Mercado Pago não concluiu a solicitação (${response.status}${detail ? `: ${detail}` : ""}). Tente novamente pela página de compras.`);
  }
  return response.json();
}

/** Production credentials (MERCADO_PAGO_ACCESS_TOKEN) switch on real charges; otherwise only the test seller is accepted. */
export const isLiveMode = () => Boolean(process.env["MERCADO_PAGO_ACCESS_TOKEN"]);
async function testSeller() {
  const seller = z.object({ id: z.number(), tags: z.array(z.string()) }).parse(await mpRequest("/users/me"));
  const isTest = seller.tags.includes("test_user");
  if (isLiveMode() === isTest) throw new Error(isLiveMode() ? "A credencial de produção pertence a uma conta de teste." : "Use a credencial da conta vendedora de teste.");
  return seller.id;
}

const OPEN_STATUSES = ["pending", "in_process", "approved", "authorized", "in_mediation"];

/** Checkout Transparente (test only): creates the payment directly; amount comes from the order, never the client. */
export async function createDirectTestPayment(input: DirectPayment, userId: string, email: string) {
  const sellerId = await testSeller();
  const { data: order, error } = await supabaseAdmin.from("commerce_orders").select("*").eq("id", input.orderId).eq("user_id", userId).single();
  if (error || !order || !["awaiting_integration", "pending", "rejected"].includes(order.status) || order.total_cents <= 0) throw new Error("Este pedido não está disponível para teste de pagamento.");
  const existing = await supabaseAdmin.from("commerce_payment_tests").select("*").eq("order_id", order.id).maybeSingle();
  if (existing.error) throw new Error("Não foi possível consultar o teste.");
  if (existing.data && existing.data.live !== isLiveMode() && existing.data.status !== "approved") {
    await supabaseAdmin.from("commerce_payment_tests").delete().eq("id", existing.data.id);
    existing.data = null;
  }
  if (existing.data?.payment_id && OPEN_STATUSES.includes(existing.data.status)) {
    // Never create a duplicate charge: show the existing payment (e.g. the same Pix code) instead.
    return paymentView(paymentViewSchema.parse(await mpRequest(`/v1/payments/${existing.data.payment_id}`)));
  }
  if (existing.data) {
    if (existing.data.status === "creating" && Date.now() - new Date(existing.data.created_at).getTime() < 60000) throw new Error("Um pagamento já está sendo processado. Aguarde alguns segundos.");
    await supabaseAdmin.from("commerce_payment_tests").delete().eq("id", existing.data.id);
  }
  const installments = input.method === "card" ? input.installments : 1;
  const { data: attempt, error: insertError } = await supabaseAdmin.from("commerce_payment_tests").insert({
    order_id: order.id, user_id: userId, amount_cents: order.total_cents, method: input.method, installments, live: isLiveMode(),
  }).select("*").single();
  if (insertError || !attempt) throw new Error("Não foi possível iniciar o teste. Atualize suas compras.");
  let view: PaymentView;
  let updatedAt = new Date().toISOString();
  try {
    console.info("[MercadoPago] creating test payment", { attempt: attempt.id, method: input.method, installments, amount: order.total_cents });
    const raw = await mpRequest("/v1/payments", {
      method: "POST", headers: { "X-Idempotency-Key": attempt.id },
      body: JSON.stringify(buildPaymentBody(input, { attemptId: attempt.id, amountCents: order.total_cents, email, live: attempt.live, notificationUrl: `${RETURN_ORIGIN}${MP_TEST_WEBHOOK_PATH}` })),
    });
    const payment = paymentViewSchema.parse(raw);
    if (!matchesTestPayment(payment, attempt, sellerId)) throw new Error("Resposta do Mercado Pago não corresponde a este pedido.");
    view = paymentView(payment);
    updatedAt = payment.date_last_updated;
    console.info("[MercadoPago] test payment created", { attempt: attempt.id, status: payment.status, detail: payment.status_detail });
  } catch (e) {
    await supabaseAdmin.from("commerce_payment_tests").delete().eq("id", attempt.id).is("payment_id", null);
    throw e;
  }
  const { error: saveError } = await supabaseAdmin.from("commerce_payment_tests").update({ payment_id: view.paymentId, status: view.status, checked_at: updatedAt }).eq("id", attempt.id);
  if (saveError) console.error("[MercadoPago] could not save payment", { attempt: attempt.id });
  if (attempt.live) await applyLive(order.id, view.status);
  return view;
}

export async function reconcileTestPayment(paymentId: string, userId?: string) {
  paymentIdSchema.parse(paymentId);
  const sellerId = await testSeller();
  const payment = paymentViewSchema.parse(await mpRequest(`/v1/payments/${paymentId}`));
  const attemptId = z.string().uuid().parse(referenceAttemptId(payment.external_reference));
  const { data: attempt, error } = await supabaseAdmin.from("commerce_payment_tests").select("*").eq("id", attemptId).single();
  if (error || !attempt || (userId && attempt.user_id !== userId) || !matchesTestPayment(payment, attempt, sellerId)) throw new Error("Pagamento não corresponde a este pedido da Empiria.");
  const { error: saveError } = await supabaseAdmin.from("commerce_payment_tests").update({
    payment_id: String(payment.id), status: payment.status, checked_at: payment.date_last_updated,
  }).eq("id", attempt.id).or(`checked_at.is.null,checked_at.lte.${payment.date_last_updated}`);
  if (saveError) throw new Error("Não foi possível atualizar o resultado do pagamento.");
  // Only live (production) payments change orders and enrollments; test payments never do.
  if (attempt.live) await applyLive(attempt.order_id, payment.status);
  return { status: payment.status, view: paymentView(payment) };
}

export async function refreshOrderTest(orderId: string, userId: string) {
  const { data: attempt, error } = await supabaseAdmin.from("commerce_payment_tests").select("*").eq("order_id", orderId).eq("user_id", userId).maybeSingle();
  if (error || !attempt) throw new Error("Este pedido ainda não possui um teste de pagamento.");
  if (attempt.payment_id) return { ...(await reconcileTestPayment(attempt.payment_id, userId)), found: true };
  const results = z.object({ results: z.array(z.object({ id: z.number().int().positive() })) }).parse(await mpRequest(`/v1/payments/search?external_reference=${encodeURIComponent(paymentReference(attempt.id, attempt.live))}&sort=date_created&criteria=desc&limit=1`));
  const result = results.results[0];
  if (!result) return { status: attempt.status, found: false };
  const updated = await reconcileTestPayment(String(result.id), userId);
  return { ...updated, found: true };
}
async function applyLive(orderId: string, status: string) {
  const { data: before } = await supabaseAdmin.from("commerce_orders").select("status").eq("id", orderId).maybeSingle();
  const { data, error } = await supabaseAdmin.rpc("apply_commerce_payment", { p_order: orderId, p_status: status });
  if (error) { console.error("[MercadoPago] could not apply payment to order", { orderId, status }); throw new Error("Pagamento recebido, mas o pedido não pôde ser atualizado. A Empiria foi avisada."); }
  console.info("[MercadoPago] order updated", { orderId, status: data });
  // Email only on the transition to paid, so repeated notifications never resend.
  if (status === "approved" && before && before.status !== "paid") {
    const { emailPaymentApproved } = await import("./email.server");
    await emailPaymentApproved(orderId);
  }
}
