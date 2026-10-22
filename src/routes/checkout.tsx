import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SiteShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAccount } from "@/lib/account";
import { createOrder, previewCoupon } from "@/lib/commerce.functions";
import { startPaymentTest } from "@/lib/mercado-pago.functions";
import { commerceHead, discountCents, purchaseSchema } from "@/lib/commerce-schema";
import { brl } from "@/lib/store";
export const Route = createFileRoute("/checkout")({
  validateSearch: z.object({ curso: z.string().max(100).catch("").default("") }),
  head: () =>
    commerceHead("Matrícula", "Selecione seus cursos e acompanhe a abertura dos pagamentos."),
  component: Checkout,
});
function Checkout() {
  const { curso } = Route.useSearch();
  const { user } = useAccount();
  const [products, setProducts] = useState<Tables<"commerce_products">[]>([]);
  const [terms, setTerms] = useState<Tables<"commerce_terms"> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<"pix" | "boleto" | "card">("pix");
  const [installments, setInstallments] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [requestId, setRequestId] = useState("");
  const create = useServerFn(createOrder);
  const startTest = useServerFn(startPaymentTest);
  const preview = useServerFn(previewCoupon);
  const [couponInfo, setCouponInfo] = useState<Awaited<ReturnType<typeof previewCoupon>> | null>(null);
  const nav = useNavigate();
  useEffect(() => {
    setRequestId(crypto.randomUUID());
    void Promise.all([
      supabase.from("commerce_products").select("*").eq("active", true),
      supabase
        .from("commerce_terms")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(1),
    ]).then(([p, t]) => {
      if (p.error || t.error) setMessage("Não foi possível carregar a matrícula.");
      setProducts(p.data ?? []);
      setTerms(t.data?.[0] ?? null);
      setSelected((p.data ?? []).filter((x) => x.slug === curso).map((x) => x.id));
      setLoaded(true);
    });
  }, [curso]);
  const subtotal = products
    .filter((x) => selected.includes(x.id))
    .reduce((s, x) => s + x.price_cents, 0);
  const discount = couponInfo?.valid ? discountCents(subtotal, couponInfo.kind, couponInfo.value) : 0;
  const total = subtotal - discount;
  const isFree = selected.length > 0 && total === 0;
  useEffect(() => {
    const code = coupon.trim();
    if (!code || !user) { setCouponInfo(null); return; }
    const t = setTimeout(() => {
      preview({ data: { code } }).then(setCouponInfo).catch(() => setCouponInfo(null));
    }, 400);
    return () => clearTimeout(t);
  }, [coupon, user, preview]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!terms) return;
    setBusy(true);
    setMessage("");
    try {
      const url = new URL(window.location.href);
      const tags = Object.fromEntries(
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].flatMap((k) =>
          url.searchParams.get(k) ? [[k, url.searchParams.get(k) ?? ""]] : [],
        ),
      );
      const input = purchaseSchema.parse({
        productIds: selected,
        coupon,
        method: isFree ? "pix" : method,
        installments: !isFree && method === "card" ? installments : 1,
        termsId: terms.id,
        consent,
        requestId,
        source: tags["utm_source"] ?? "direct",
        tags,
      });
      const order = await create({ data: input });
      if (isFree) {
        await nav({ to: "/meus-programas" });
      } else {
        const checkout = await startTest({ data: { orderId: order.id } });
        window.location.assign(checkout.url);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível registrar seu pedido.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SiteShell>
      <main className="account-page">
        <div className="eyebrow">Conta, compra e matrícula</div>
        <h1>Sua matrícula</h1>
        <div className="integration-notice">
          <b>Mercado Pago · ambiente de teste</b>
          <p>Use somente uma conta compradora e cartões de teste do Mercado Pago. Não há cobrança real nem liberação de matrícula paga nesta etapa.</p>
        </div>
        {!loaded ? (
          <p>Carregando cursos…</p>
        ) : (
          <form onSubmit={submit} className="checkout-layout">
            <div>
              <h2>Selecione os cursos</h2>
              {!products.length && (
                <p className="muted">Os produtos comerciais ainda não foram publicados.</p>
              )}
              {products.map((p) => (
                <label className="product-option" key={p.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => {
                      setSelected((a) =>
                        a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id],
                      );
                      setRequestId(crypto.randomUUID());
                    }}
                  />
                  <span>
                    <b>{p.title}</b>
                    <small>{p.kind}</small>
                  </span>
                  <b>{brl(p.price_cents / 100)}</b>
                </label>
              ))}
              {isFree ? (
                <div className="integration-notice"><b>Matrícula gratuita</b><p>Seu cupom cobre 100% do valor. Não há pagamento: basta aceitar os termos para ativar a matrícula.</p></div>
              ) : (<>
              <h2>Forma de pagamento</h2>
              <div className="commerce-actions">
                {(["pix", "boleto", "card"] as const).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    className={method === m ? "btn" : "btn ghost"}
                    aria-pressed={method === m}
                    onClick={() => {
                      setMethod(m);
                      setRequestId(crypto.randomUUID());
                    }}
                  >
                    {m === "card" ? "Cartão" : m === "pix" ? "Pix" : "Boleto"}
                  </Button>
                ))}
              </div>
              {method === "card" && (
                <label className="field">
                  Parcelas
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        Até {n}x — condições no Mercado Pago
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="muted sm">
                Disponibilidade, juros e condições são confirmados no Mercado Pago.
              </p>
              </>)}
              {terms ? (
                <details className="terms-text">
                  <summary>Termos de matrícula · versão {terms.version}</summary>
                  <p>{terms.body}</p>
                </details>
              ) : (
                <p className="integration-notice">
                  Os termos de matrícula aguardam publicação pela Empiria.
                </p>
              )}
              <label className="consent-field">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={!terms}
                />
                <span>Li e aceito os termos de matrícula publicados.</span>
              </label>
            </div>
            <aside className="checkout-summary">
              <h2>Resumo</h2>
              <p>{selected.length} curso(s)</p>
              {discount > 0 && <p className="muted sm">Subtotal {brl(subtotal / 100)} · desconto −{brl(discount / 100)}</p>}
              <b className="summary-total">{brl(total / 100)}</b>
              <label className="field">
                Cupom
                <input
                  value={coupon}
                  maxLength={40}
                  onChange={(e) => {
                    setCoupon(e.target.value);
                    setRequestId(crypto.randomUUID());
                  }}
                />
              </label>
              <p className="muted sm">
                {coupon.trim() && couponInfo && !couponInfo.valid ? "Cupom inválido ou expirado." : couponInfo?.valid ? "Cupom aplicado." : "O desconto é confirmado ao registrar. Cupom de 100% ativa a matrícula direto, sem pagamento."}
              </p>
              {user ? (
                <Button
                  className="btn wide"
                  disabled={busy || !terms || !consent || !selected.length}
                >
                  {busy ? "Preparando…" : isFree ? "Ativar matrícula" : "Testar pagamento no Mercado Pago"}
                </Button>
              ) : (
                <Link to="/auth" className="btn wide">
                  Entrar para continuar
                </Link>
              )}
              <p role="alert" className="form-error">
                {message}
              </p>
            </aside>
          </form>
        )}
      </main>
    </SiteShell>
  );
}
