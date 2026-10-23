// App email via Resend, sent as the Empiria atendimento address (replies land in the Titan mailbox). Failures are logged, never thrown,
// so an email problem never blocks an order, payment or form submission.

export const EMAIL_FROM_ADDRESS = "atendimento@empiria-law.com";
const SITE = "https://empiria-law.com";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F4F2F7;font-family:Arial,Helvetica,sans-serif;color:#3B2249">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="font-size:22px;font-weight:700;letter-spacing:.5px;margin-bottom:24px">Empiria</div>
<div style="background:#ffffff;border:1px solid #e3dcea;border-radius:10px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#3B2249">${body}</div>
${cta ? `<p style="margin:24px 0 0"><a href="${cta.href}" style="background:#3B2249;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:700">${esc(cta.label)}</a></p>` : ""}
</div>
<p style="font-size:12px;color:#693E74;margin-top:20px">Dúvidas? Responda este e-mail ou escreva para ${EMAIL_FROM_ADDRESS}.</p>
</div></body></html>`;
}

export async function sendEmail(input: { to: string; subject: string; html: string; replyTo?: string }) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.warn("[Email] envio desativado: chave do Resend não configurada");
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Empiria <${EMAIL_FROM_ADDRESS}>`,
        to: [input.to],
        reply_to: input.replyTo ?? EMAIL_FROM_ADDRESS,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      console.error("[Email] Resend recusou o envio", { status: res.status, body: await res.text(), subject: input.subject });
      return { sent: false };
    }
    console.info("[Email] enviado", { subject: input.subject });
    return { sent: true };
  } catch (e) {
    console.error("[Email] falha no envio", { subject: input.subject, error: e instanceof Error ? e.message : String(e) });
    return { sent: false };
  }
}

async function orderContext(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("commerce_orders")
    .select("*, commerce_order_items(*)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
  const email = u?.user?.email;
  if (!email) return null;
  const items = ((order as { commerce_order_items?: Record<string, unknown>[] }).commerce_order_items ?? [])
    .map((i) => esc(String(i["title"] ?? i["product_title"] ?? i["product_id"] ?? "Curso")))
    .map((t) => `<li>${t}</li>`)
    .join("");
  const total = typeof order.total_cents === "number" ? (order.total_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
  return { email, items, total };
}

export async function emailOrderCreated(orderId: string, free: boolean) {
  const c = await orderContext(orderId);
  if (!c) return;
  await sendEmail(
    free
      ? { to: c.email, subject: "Sua matrícula na Empiria está ativa", html: layout("Matrícula ativa", `<p>Sua matrícula foi ativada:</p><ul>${c.items}</ul>`, { label: "Começar agora", href: `${SITE}/meus-programas` }) }
      : { to: c.email, subject: "Recebemos seu pedido — Empiria", html: layout("Recebemos seu pedido", `<p>Seu pedido foi registrado:</p><ul>${c.items}</ul><p><b>Total: ${c.total}</b></p><p>Assim que o pagamento for aprovado, sua matrícula é liberada e você recebe outro e-mail.</p>`, { label: "Ver minhas compras", href: `${SITE}/compras` }) },
  );
}

export async function emailPaymentApproved(orderId: string) {
  const c = await orderContext(orderId);
  if (!c) return;
  await sendEmail({ to: c.email, subject: "Pagamento aprovado — sua matrícula está liberada", html: layout("Matrícula liberada", `<p>Recebemos seu pagamento de <b>${c.total}</b>. Seu acesso já está disponível:</p><ul>${c.items}</ul>`, { label: "Entrar no curso", href: `${SITE}/meus-programas` }) });
}

export async function emailOrderCancelled(orderId: string) {
  const c = await orderContext(orderId);
  if (!c) return;
  await sendEmail({ to: c.email, subject: "Seu pedido foi cancelado — Empiria", html: layout("Pedido cancelado", `<p>O cancelamento do seu pedido foi registrado:</p><ul>${c.items}</ul><p>Se houve pagamento, o estorno segue as regras do meio de pagamento utilizado.</p>`, { label: "Ver minhas compras", href: `${SITE}/compras` }) });
}

export async function emailInterestToTeam(lead: { name: string; email: string; interest?: string | null; message?: string | null; source?: string | null }) {
  await sendEmail({
    to: EMAIL_FROM_ADDRESS,
    replyTo: lead.email,
    subject: `Novo interessado: ${lead.name}`,
    html: layout("Novo interessado no site", `<p><b>Nome:</b> ${esc(lead.name)}<br><b>E-mail:</b> ${esc(lead.email)}<br><b>Interesse:</b> ${esc(lead.interest ?? "-")}<br><b>Origem:</b> ${esc(lead.source ?? "-")}</p><p>${esc(lead.message ?? "")}</p><p>Responda este e-mail para falar direto com a pessoa.</p>`),
  });
}
