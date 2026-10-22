import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { excludedMethods, matchesTestPayment, paymentIdSchema, paymentSchema, MP_TEST_WEBHOOK_PATH } from "./mercado-pago-rules";

const MP_API = "https://api.mercadopago.com";
// Production is intentionally unavailable until test checkout is accepted.
const RETURN_ORIGIN = "https://empiria-law.com";

async function mpRequest(path: string, init?: RequestInit) {
  const token = process.env["MERCADO_PAGO_TEST_ACCESS_TOKEN"];
  if (!token) throw new Error("Mercado Pago de teste ainda não configurado.");
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

async function testSeller() {
  const seller = z.object({ id: z.number(), tags: z.array(z.string()) }).parse(await mpRequest("/users/me"));
  if (!seller.tags.includes("test_user")) throw new Error("Use a credencial da conta vendedora de teste. Cobranças reais estão bloqueadas.");
  return seller.id;
}

export async function startTestCheckout(orderId: string, userId: string) {
  await testSeller();
  const { data: order, error } = await supabaseAdmin.from("commerce_orders").select("*").eq("id", orderId).eq("user_id", userId).single();
  if (error || !order || order.status !== "awaiting_integration" || order.total_cents <= 0) throw new Error("Este pedido não está disponível para teste de pagamento.");
  const existing = await supabaseAdmin.from("commerce_payment_tests").select("*").eq("order_id", orderId).maybeSingle();
  if (existing.error) throw new Error("Não foi possível consultar o teste.");
  if (existing.data?.checkout_url) return { url: existing.data.checkout_url };
  if (existing.data) throw new Error("Um teste já está sendo preparado. Aguarde ou solicite ajuda à Empiria; não crie cobranças duplicadas.");
  const { data: attempt, error: insertError } = await supabaseAdmin.from("commerce_payment_tests").insert({
    order_id: order.id, user_id: userId, amount_cents: order.total_cents,
    method: order.payment_method, installments: order.installments,
  }).select("*").single();
  if (insertError || !attempt) throw new Error("Não foi possível iniciar o teste. Atualize suas compras.");
  let preference: { id: string; init_point: string; sandbox_init_point?: string | null };
  try {
    const methods = z.array(z.object({ id: z.string(), payment_type_id: z.string(), status: z.string() })).parse(await mpRequest("/v1/payment_methods"));
    const excluded = excludedMethods(methods, order.payment_method);
    console.info("[MercadoPago] creating test preference", { attempt: attempt.id, method: order.payment_method, installments: order.installments, amount: order.total_cents, excluded: excluded.length });
    preference = z.object({ id: z.string(), init_point: z.string().url(), sandbox_init_point: z.string().url().nullish() }).parse(await mpRequest("/checkout/preferences", {
      method: "POST", body: JSON.stringify({
        items: [{ id: order.id, title: "Empiria — teste de matrícula", quantity: 1, currency_id: "BRL", unit_price: order.total_cents / 100 }],
        external_reference: `empiria-test:${attempt.id}`,
        payment_methods: { excluded_payment_methods: excluded, installments: order.payment_method === "card" ? order.installments : 1 },
        back_urls: { success: `${RETURN_ORIGIN}/compras`, pending: `${RETURN_ORIGIN}/compras`, failure: `${RETURN_ORIGIN}/compras` },
        notification_url: `${RETURN_ORIGIN}${MP_TEST_WEBHOOK_PATH}`,
        statement_descriptor: "EMPIRIA TESTE",
      }),
    }));
  } catch (e) {
    // Remove the unfinished attempt so the user can retry without being blocked.
    await supabaseAdmin.from("commerce_payment_tests").delete().eq("id", attempt.id).is("checkout_url", null);
    throw e;
  }
  // Test sellers (verified by testSeller) now receive a regular init_point; no real charge is possible.
  const checkout = new URL(preference.sandbox_init_point || preference.init_point);
  if (checkout.protocol !== "https:" || !["sandbox.mercadopago.com.br", "www.mercadopago.com.br"].includes(checkout.hostname)) throw new Error("Endereço de teste inválido.");
  const { error: saveError } = await supabaseAdmin.from("commerce_payment_tests").update({ preference_id: preference.id, checkout_url: checkout.href, status: "ready" }).eq("id", attempt.id);
  if (saveError) throw new Error("Teste criado, mas o endereço não pôde ser salvo. Solicite ajuda antes de tentar novamente.");
  return { url: checkout.href };
}

export async function reconcileTestPayment(paymentId: string, userId?: string) {
  paymentIdSchema.parse(paymentId);
  const sellerId = await testSeller();
  const payment = paymentSchema.parse(await mpRequest(`/v1/payments/${paymentId}`));
  const attemptId = z.string().uuid().parse(payment.external_reference.replace(/^empiria-test:/, ""));
  const { data: attempt, error } = await supabaseAdmin.from("commerce_payment_tests").select("*").eq("id", attemptId).single();
  if (error || !attempt || (userId && attempt.user_id !== userId) || !matchesTestPayment(payment, attempt, sellerId)) throw new Error("Pagamento não corresponde a este teste da Empiria.");
  const { error: saveError } = await supabaseAdmin.from("commerce_payment_tests").update({
    payment_id: String(payment.id), status: payment.status, checked_at: payment.date_last_updated,
  }).eq("id", attempt.id).or(`checked_at.is.null,checked_at.lte.${payment.date_last_updated}`);
  if (saveError) throw new Error("Não foi possível atualizar o resultado do teste.");
  // Deliberately never update orders or enrollments from a test payment.
  return { status: payment.status };
}

export async function refreshOrderTest(orderId: string, userId: string) {
  const { data: attempt, error } = await supabaseAdmin.from("commerce_payment_tests").select("*").eq("order_id", orderId).eq("user_id", userId).maybeSingle();
  if (error || !attempt) throw new Error("Este pedido ainda não possui um teste de pagamento.");
  const results = z.object({ results: z.array(z.object({ id: z.number().int().positive() })) }).parse(await mpRequest(`/v1/payments/search?external_reference=${encodeURIComponent(`empiria-test:${attempt.id}`)}&sort=date_created&criteria=desc&limit=1`));
  const result = results.results[0];
  if (!result) return { status: attempt.status, found: false };
  const updated = await reconcileTestPayment(String(result.id), userId);
  return { ...updated, found: true };
}