import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { accountOptions } from "./minha-conta";
import { cancelOrder } from "@/lib/commerce.functions";
import { refreshPaymentTest } from "@/lib/mercado-pago.functions";
import { PaymentPanel } from "@/components/PaymentPanel";
import { testPaymentLabel } from "@/lib/mercado-pago-rules";
import { commerceHead, statusLabel } from "@/lib/commerce-schema";
import { brl } from "@/lib/store";
export const Route = createFileRoute("/_authenticated/compras")({
  head: () =>
    commerceHead(
      "Minhas compras",
      "Histórico de pedidos, matrículas e solicitações de cancelamento.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountOptions()),
  component: Purchases,
});
function Purchases() {
  const { data } = useSuspenseQuery(accountOptions());
  const cancel = useServerFn(cancelOrder);
  const [paying, setPaying] = useState<string | null>(null);
  const refreshTest = useServerFn(refreshPaymentTest);
  const { queryClient } = Route.useRouteContext();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function paymentAction(orderId: string) {
    setBusy(true);
    setMessage("");
    try {
      const result = await refreshTest({ data: { orderId } });
      setMessage(result.found ? `${testPaymentLabel[result.status] ?? result.status}.` : "Nenhum pagamento encontrado no Mercado Pago para este pedido.");
      await queryClient.invalidateQueries({ queryKey: ["account"] });
    } catch (e) {
      console.error("[Compras] falha no pagamento de teste do Mercado Pago:", e);
      setMessage(e instanceof Error ? e.message : "Não foi possível consultar o pagamento.");
    } finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await cancel({ data: { id: selected, reason } });
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      setSelected(null);
      setMessage("Cancelamento registrado. A confirmação por e-mail ainda não está disponível.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell>
      <main className="account-page">
        <div className="eyebrow">Conta e matrícula</div>
        <h1>Minhas compras</h1>
        <nav className="commerce-actions">
          <Link to="/minha-conta">Configurações da conta</Link>
          <Link to="/cursos" className="btn ghost">
            Explorar cursos
          </Link>
        </nav>
        <p role="status">{message}</p>
        <div className="integration-notice"><b>Pagamentos via Mercado Pago</b><p>Pix e boleto podem levar alguns minutos para confirmar. A matrícula é liberada assim que o pagamento é aprovado.</p></div>
        {!data.orders.length && <p className="muted">Você ainda não tem pedidos. Encontre seu próximo curso no catálogo.</p>}
        <div className="order-list">
          {data.orders.map((o) => (
            <article className="order-row" key={o.id}>
              <header>
                <div>
                  <span className="muted sm">
                    {new Date(o.created_at).toLocaleDateString("pt-BR")} · Pedido {o.id.slice(0, 8)}
                  </span>
                  <h3>{o.commerce_order_items.map((i) => i.title).join(" + ")}</h3>
                </div>
                <b>{brl(o.total_cents / 100)}</b>
              </header>
              <span className="sig mid">{statusLabel[o.status] ?? o.status}</span>
              {o.status === "awaiting_integration" && (
                <p className="muted sm">
                  Aguardando pagamento.
                </p>
              )}
              {data.paymentTests.filter((t) => t.order_id === o.id).map((t) => (
                <p className="muted sm" key={t.order_id}>Mercado Pago: {testPaymentLabel[t.status] ?? t.status}</p>
              ))}
              {["awaiting_integration", "pending", "rejected"].includes(o.status) && o.total_cents > 0 && (
                <div className="commerce-actions">
                  <Button className="btn" disabled={busy} onClick={() => setPaying(paying === o.id ? null : o.id)}>{paying === o.id ? "Fechar pagamento" : "Pagar"}</Button>
                  {data.paymentTests.some((t) => t.order_id === o.id) && <Button className="btn ghost" disabled={busy} onClick={() => void paymentAction(o.id)}>Atualizar status do pagamento</Button>}
                </div>
              )}
              {paying === o.id && (
                <PaymentPanel orderId={o.id} totalCents={o.total_cents} initialMethod={(["pix", "boleto", "card"] as const).find((m) => m === o.payment_method) ?? "pix"} onChange={() => void queryClient.invalidateQueries({ queryKey: ["account"] })} />
              )}
              <p className="muted sm">
                Termos aceitos em {new Date(o.terms_accepted_at).toLocaleString("pt-BR")}
              </p>
              {!["cancelled", "refunded", "cancellation_requested", "rejected"].includes(
                o.status,
              ) && (
                <Button
                  className="btn ghost"
                  onClick={() => {
                    setSelected(o.id);
                    setReason("");
                  }}
                >
                  Solicitar cancelamento
                </Button>
              )}
              {selected === o.id && (
                <form className="commerce-form" onSubmit={submit}>
                  <label className="field">
                    Motivo do cancelamento
                    <textarea
                      required
                      minLength={3}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <div className="commerce-actions">
                    <Button className="btn" disabled={busy}>
                      Confirmar cancelamento
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                      Voltar
                    </Button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
