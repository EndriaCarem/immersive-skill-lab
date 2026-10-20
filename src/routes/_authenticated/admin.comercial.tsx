import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { adminCommerce, saveCoupon, publishTerms, saveProduct } from "@/lib/commerce.functions";
import { adminGuard } from "@/lib/admin-guard";
import { commerceHead, statusLabel, couponSchema } from "@/lib/commerce-schema";
import { brl, useStore } from "@/lib/store";
const options = () =>
  queryOptions({ queryKey: ["admin-commerce"], queryFn: () => adminCommerce() });
export const Route = createFileRoute("/_authenticated/admin/comercial")({
  beforeLoad: adminGuard,
  head: () =>
    commerceHead(
      "Operação comercial",
      "Pedidos, matrículas, produtos, cupons e termos da Empiria.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(options()),
  component: Commercial,
});
function Commercial() {
  const { data } = useSuspenseQuery(options());
  const { queryClient } = Route.useRouteContext();
  const programs = useStore((s) => s.programs);
  const couponFn = useServerFn(saveCoupon);
  const termsFn = useServerFn(publishTerms);
  const productFn = useServerFn(saveProduct);
  const [tab, setTab] = useState("orders");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["admin-commerce"] });
      setMessage("Registro salvo.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  const orders = data.orders.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      [
        o.id,
        ...o.commerce_order_items.map((i) => i.title),
        data.profiles.find((p) => p.id === o.user_id)?.full_name,
      ].some((v) => v?.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <AppShell>
      <main className="account-page commercial-page">
        <div className="eyebrow">Administração</div>
        <h1>Operação comercial</h1>
        <Link to="/admin">Editor e simulações</Link>
        <div className="integration-notice">
          <b>Mercado Pago e Resend aguardando integração</b>
          <p>
            Cobranças e confirmações por e-mail não estão ativadas. NFS-e: emissão manual nesta
            etapa.
          </p>
        </div>
        <div className="kpis">
          <div className="kpi">
            <small>Recebido</small>
            <b>
              {brl(
                data.orders
                  .filter((o) => o.status === "paid")
                  .reduce((s, o) => s + o.total_cents, 0) / 100,
              )}
            </b>
          </div>
          <div className="kpi">
            <small>Pedidos</small>
            <b>{data.orders.length}</b>
          </div>
          <div className="kpi">
            <small>Matrículas ativas</small>
            <b>{data.enrollments.filter((e) => e.status === "active").length}</b>
          </div>
          <div className="kpi">
            <small>Cancelamentos solicitados</small>
            <b>{data.orders.filter((o) => o.status === "cancellation_requested").length}</b>
          </div>
        </div>
        <nav className="commerce-actions">
          {(
            [
              ["orders", "Pedidos"],
              ["products", "Produtos"],
              ["coupons", "Cupons"],
              ["terms", "Termos"],
            ] as const
          ).map(([v, l]) => (
            <Button key={v} className={tab === v ? "btn" : "btn ghost"} onClick={() => setTab(v)}>
              {l}
            </Button>
          ))}
        </nav>
        <p role="status">{message}</p>
        {tab === "orders" && (
          <>
            <div className="interest-fields">
              <label className="field">
                Buscar pedido
                <input value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <label className="field">
                Status
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">Todos</option>
                  {Object.entries(statusLabel).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="order-list">
              {!orders.length && <p>Nenhum pedido encontrado.</p>}
              {orders.map((o) => (
                <article className="order-row" key={o.id}>
                  <header>
                    <h3>
                      {data.profiles.find((p) => p.id === o.user_id)?.full_name ?? "Aluno"} ·{" "}
                      {o.commerce_order_items.map((i) => i.title).join(" + ")}
                    </h3>
                    <b>{brl(o.total_cents / 100)}</b>
                  </header>
                  <span className="sig mid">{statusLabel[o.status]}</span>
                  <p className="muted sm">
                    {o.id} · {new Date(o.created_at).toLocaleString("pt-BR")} · Origem: {o.source}
                  </p>
                  <p className="muted sm">
                    Aceite: {new Date(o.terms_accepted_at).toLocaleString("pt-BR")} · IP:{" "}
                    {String(o.terms_ip ?? "Não disponível no ambiente local")} · E-mail: não
                    configurado
                  </p>
                  {o.cancellation_reason && <p>Cancelamento: {o.cancellation_reason}</p>}
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "products" && (
          <>
            <p className="muted">
              Publique o produto comercial a partir do curso. O conteúdo das simulações permanece
              separado nesta etapa.
            </p>
            {programs
              .filter((p) => p.status === "published")
              .map((p) => {
                const product = data.products.find((x) => x.id === p.id);
                return (
                  <article className="order-row" key={p.id}>
                    <header>
                      <h3>{p.title}</h3>
                      <b>{brl(product ? product.price_cents / 100 : p.price)}</b>
                    </header>
                    <p className="muted">
                      {product?.active ? "Disponível para pedido" : "Não publicado para compra"}
                    </p>
                    <Button
                      className="btn ghost"
                      disabled={busy}
                      onClick={() =>
                        perform(() =>
                          productFn({
                            data: {
                              id: p.id,
                              slug: p.slug,
                              title: p.title,
                              kind: p.kind,
                              price_cents: Math.round((p.price ?? 0) * 100),
                              active: !product?.active,
                            },
                          }),
                        )
                      }
                    >
                      {product?.active ? "Retirar da compra" : "Publicar produto"}
                    </Button>
                  </article>
                );
              })}
          </>
        )}
        {tab === "coupons" && (
          <>
            <form
              className="commerce-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void perform(() =>
                  couponFn({
                    data: couponSchema.parse({
                      code: String(f.get("code")),
                      kind: f.get("kind"),
                      value: Number(f.get("value")),
                      active: true,
                      max_uses: f.get("max") ? Number(f.get("max")) : null,
                      expires_at: f.get("expires")
                        ? new Date(String(f.get("expires"))).toISOString()
                        : null,
                    }),
                  }),
                );
              }}
            >
              <h2>Novo cupom</h2>
              <div className="interest-fields">
                <label className="field">
                  Código
                  <input name="code" required minLength={2} maxLength={40} />
                </label>
                <label className="field">
                  Tipo
                  <select name="kind">
                    <option value="percent">Percentual</option>
                    <option value="fixed">Valor fixo em centavos</option>
                  </select>
                </label>
                <label className="field">
                  Valor
                  <input name="value" type="number" min={1} required />
                </label>
                <label className="field">
                  Limite de usos
                  <input name="max" type="number" min={1} />
                </label>
                <label className="field">
                  Expira em
                  <input name="expires" type="datetime-local" />
                </label>
              </div>
              <Button className="btn" disabled={busy}>
                Salvar cupom
              </Button>
            </form>
            {data.coupons.map((c) => (
              <article key={c.id} className="order-row">
                <header>
                  <h3>{c.code}</h3>
                  <b>{c.kind === "percent" ? `${c.value}%` : brl(c.value / 100)}</b>
                </header>
                <p>
                  {c.uses} usos · {c.active ? "Ativo" : "Inativo"}
                </p>
                <Button
                  className="btn ghost"
                  disabled={busy}
                  onClick={() =>
                    perform(() =>
                      couponFn({
                        data: {
                          code: c.code,
                          kind: c.kind === "percent" ? "percent" : "fixed",
                          value: c.value,
                          active: !c.active,
                          max_uses: c.max_uses,
                          expires_at: c.expires_at,
                        },
                      }),
                    )
                  }
                >
                  {c.active ? "Desativar" : "Ativar"}
                </Button>
              </article>
            ))}
          </>
        )}
        {tab === "terms" && (
          <>
            <form
              className="commerce-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (!window.confirm("Publicar esta versão dos termos para novas matrículas?"))
                  return;
                void perform(() =>
                  termsFn({
                    data: { version: String(f.get("version")), body: String(f.get("body")) },
                  }),
                );
              }}
            >
              <h2>Publicar termos de matrícula</h2>
              <p className="muted">
                Publique somente o texto aprovado pela Empiria. Cada pedido preserva a versão
                aceita.
              </p>
              <label className="field">
                Versão
                <input name="version" required maxLength={40} />
              </label>
              <label className="field">
                Texto aprovado
                <textarea name="body" required minLength={50} maxLength={50000} rows={12} />
              </label>
              <Button className="btn" disabled={busy}>
                Publicar versão
              </Button>
            </form>
            {data.terms.map((t) => (
              <details className="terms-text" key={t.id}>
                <summary>Versão {t.version}</summary>
                <p>{t.body}</p>
              </details>
            ))}
          </>
        )}
      </main>
    </AppShell>
  );
}
