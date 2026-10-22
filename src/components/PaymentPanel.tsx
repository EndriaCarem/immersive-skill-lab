import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getPaymentConfig, payTestOrder, refreshPaymentTest } from "@/lib/mercado-pago.functions";
import { testPaymentLabel, type DirectPayment, type PaymentView } from "@/lib/mercado-pago-rules";
import { brl } from "@/lib/store";

type Method = "pix" | "boleto" | "card";
type BrickController = { unmount: () => void };
type MpWindow = Window & { MercadoPago?: new (key: string, opts: { locale: string }) => { bricks: () => { create: (kind: string, id: string, settings: unknown) => Promise<BrickController> } } };

function loadSdk(): Promise<void> {
  const w = window as MpWindow;
  if (w.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-mp-sdk]");
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("Não foi possível carregar o Mercado Pago.")));
    if (!existing) { s.src = "https://sdk.mercadopago.com/js/v2"; s.dataset["mpSdk"] = "1"; document.head.appendChild(s); }
  });
}

const emptyBoleto = { firstName: "", lastName: "", cpf: "", zip: "", street: "", number: "", neighborhood: "", city: "", uf: "" };

export function PaymentPanel({ orderId, totalCents, initialMethod = "pix", onChange }: {
  orderId: string; totalCents: number; initialMethod?: Method; onChange?: () => void;
}) {
  const pay = useServerFn(payTestOrder);
  const refresh = useServerFn(refreshPaymentTest);
  const config = useServerFn(getPaymentConfig);
  const [method, setMethod] = useState<Method>(initialMethod);
  const [result, setResult] = useState<PaymentView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [boleto, setBoleto] = useState(emptyBoleto);
  const [cardState, setCardState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [live, setLive] = useState<boolean | null>(null);
  useEffect(() => { void config().then((c) => setLive(c.live)).catch(() => setLive(null)); }, [config]);
  const brick = useRef<BrickController | null>(null);
  const containerId = `mp-card-${orderId.slice(0, 8)}`;

  function fail(e: unknown, where: string) {
    console.error(`[Pagamento] falha (${where}):`, e);
    setError(e instanceof Error ? e.message : "Não foi possível concluir o pagamento.");
  }
  async function run(input: DirectPayment) {
    setBusy(true); setError("");
    try {
      const view = await pay({ data: input });
      console.info("[Pagamento] resultado do Mercado Pago:", view.status, view.statusDetail);
      setResult(view); onChange?.();
    } catch (e) { fail(e, input.method); throw e; } finally { setBusy(false); }
  }
  async function check() {
    setBusy(true); setError("");
    try {
      const r = await refresh({ data: { orderId } });
      if ("view" in r && r.view) setResult(r.view);
      onChange?.();
    } catch (e) { fail(e, "atualizar"); } finally { setBusy(false); }
  }

  useEffect(() => {
    if (method !== "card" || result) return;
    let cancelled = false;
    setCardState("loading");
    void (async () => {
      try {
        const { publicKey } = await config();
        if (!publicKey) { if (!cancelled) setCardState("missing"); return; }
        await loadSdk();
        const MP = (window as MpWindow).MercadoPago;
        if (!MP || cancelled) return;
        const mp = new MP(publicKey, { locale: "pt-BR" });
        const controller = await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount: totalCents / 100 },
          customization: { paymentMethods: { maxInstallments: 6 }, visual: { style: { theme: "default" } } },
          callbacks: {
            onReady: () => { if (!cancelled) setCardState("ready"); },
            onError: (e: unknown) => console.error("[Pagamento] erro no formulário de cartão:", e),
            onSubmit: (f: { token: string; issuer_id?: string | number; payment_method_id: string; installments: number; payer: { email: string; identification?: { type: string; number: string } } }) =>
              run({ method: "card", orderId, token: f.token, paymentMethodId: f.payment_method_id, issuerId: f.issuer_id == null ? undefined : String(f.issuer_id), installments: Number(f.installments), payerEmail: f.payer.email, identification: f.payer.identification }),
          },
        });
        if (cancelled) controller.unmount(); else brick.current = controller;
      } catch (e) { if (!cancelled) { setCardState("error"); fail(e, "cartão"); } }
    })();
    return () => { cancelled = true; brick.current?.unmount(); brick.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, result, orderId, totalCents]);

  const field = (key: keyof typeof emptyBoleto, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="field">{label}
      <input required value={boleto[key]} onChange={(e) => setBoleto((b) => ({ ...b, [key]: e.target.value }))} {...extra} />
    </label>
  );

  return (
    <section className="payment-panel" aria-label="Pagamento">
      <header className="payment-panel-head">
        <h2>Pagamento</h2>
        <b>{brl(totalCents / 100)}</b>
      </header>
      <p className="muted sm">{live === false ? "Ambiente de teste do Mercado Pago: nenhuma cobrança real e nenhuma matrícula é liberada." : "Pagamento processado com segurança pelo Mercado Pago. A matrícula é liberada assim que o pagamento é aprovado."}</p>

      {result ? (
        <div className="payment-result">
          <span className="sig mid">{testPaymentLabel[result.status] ?? result.status}</span>
          {result.pixQrBase64 && <img className="pix-qr" alt="QR Code Pix" src={`data:image/png;base64,${result.pixQrBase64}`} />}
          {result.pixCode && (
            <div className="copy-code">
              <input readOnly value={result.pixCode} aria-label="Código Pix copia e cola" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" className="btn ghost" onClick={() => { void navigator.clipboard.writeText(result.pixCode ?? ""); setCopied(true); }}>{copied ? "Copiado" : "Copiar código"}</Button>
            </div>
          )}
          {result.boletoBarcode && (
            <div className="copy-code">
              <input readOnly value={result.boletoBarcode} aria-label="Código de barras do boleto" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" className="btn ghost" onClick={() => void navigator.clipboard.writeText(result.boletoBarcode ?? "")}>Copiar</Button>
            </div>
          )}
          {result.boletoUrl && <a className="btn ghost" href={result.boletoUrl} target="_blank" rel="noreferrer">Abrir boleto</a>}
          {result.status === "rejected" && <p className="muted sm">Pagamento recusado{result.statusDetail ? ` (${result.statusDetail})` : ""}. Você pode tentar novamente.</p>}
          <div className="commerce-actions">
            <Button type="button" className="btn" disabled={busy} onClick={() => void check()}>{busy ? "Consultando…" : "Atualizar status"}</Button>
            {["rejected", "cancelled"].includes(result.status) && <Button type="button" className="btn ghost" onClick={() => setResult(null)}>Tentar outra forma</Button>}
          </div>
        </div>
      ) : (
        <>
          <div className="commerce-actions" role="tablist">
            {(["pix", "card", "boleto"] as const).map((m) => (
              <Button key={m} type="button" role="tab" aria-selected={method === m} className={method === m ? "btn" : "btn ghost"} onClick={() => { setMethod(m); setError(""); }}>
                {m === "card" ? "Cartão" : m === "pix" ? "Pix" : "Boleto"}
              </Button>
            ))}
          </div>

          {method === "pix" && (
            <div className="payment-body">
              <p>Gere o QR Code e pague pelo app do banco. O status atualiza após a confirmação.</p>
              <Button type="button" className="btn" disabled={busy} onClick={() => void run({ method: "pix", orderId }).catch(() => {})}>{busy ? "Gerando…" : "Gerar Pix"}</Button>
            </div>
          )}

          {method === "card" && (
            <div className="payment-body">
              {cardState === "missing" && <p className="integration-notice">O pagamento com cartão ainda não está disponível. Use Pix ou boleto.</p>}
              {cardState === "loading" && <p className="muted">Carregando formulário seguro…</p>}
              <div id={containerId} />
              <p className="muted sm">Os dados do cartão vão direto para o Mercado Pago. Em até 6x.</p>
            </div>
          )}

          {method === "boleto" && (
            <form className="payment-body boleto-form" onSubmit={(e) => { e.preventDefault(); void run({ method: "boleto", orderId, payer: boleto }).catch(() => {}); }}>
              {field("firstName", "Nome", { autoComplete: "given-name" })}
              {field("lastName", "Sobrenome", { autoComplete: "family-name" })}
              {field("cpf", "CPF", { inputMode: "numeric", maxLength: 14 })}
              {field("zip", "CEP", { inputMode: "numeric", maxLength: 9, autoComplete: "postal-code" })}
              {field("street", "Rua", { autoComplete: "address-line1" })}
              {field("number", "Número")}
              {field("neighborhood", "Bairro")}
              {field("city", "Cidade", { autoComplete: "address-level2" })}
              {field("uf", "UF", { maxLength: 2 })}
              <Button className="btn" disabled={busy}>{busy ? "Gerando…" : "Gerar boleto"}</Button>
            </form>
          )}
        </>
      )}
      {error && <p role="alert" className="form-error">{error}</p>}
    </section>
  );
}
