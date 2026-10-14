import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Instagram, Linkedin, Mail, MapPin, MessageCircle } from "lucide-react";
import { SiteShell } from "@/components/AppShell";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Fale com a Empiria — Contato e dúvidas" },
      { name: "description", content: "Tire suas dúvidas sobre a formação: e-mail, WhatsApp de matrícula e formulário de contato." },
      { property: "og:title", content: "Fale com a Empiria" },
      { property: "og:description", content: "Tire suas dúvidas sobre a formação." },
    ],
  }),
  component: Contact,
});

const EMAIL = "contato@empiria.com.br";

function Contact() {
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = `Nome: ${f.get("nome")}\nE-mail: ${f.get("email")}\nInteresse: ${f.get("assunto")}\n\n${f.get("msg")}`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Dúvida sobre a formação")}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  const blocks = [
    { I: Mail, t: "E-mail", d: EMAIL },
    { I: MessageCircle, t: "WhatsApp de matrícula", d: "(11) 90000-0000" },
    { I: MapPin, t: "Endereço institucional", d: "São Paulo — SP" },
  ];
  return (
    <SiteShell>
      <section className="wrap" style={{ textAlign: "center", paddingTop: 72, paddingBottom: 40 }}>
        <span className="pillbadge soft">✦ Fale conosco</span>
        <h1 className="display" style={{ fontSize: "clamp(36px,5vw,60px)" }}>
          Fale com a <em>Empiria</em>
        </h1>
        <p className="lead" style={{ margin: "0 auto" }}>
          Tire suas dúvidas sobre a formação, a pré-venda ou parcerias com escritórios.
        </p>
      </section>
      <section className="wrap grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 48, alignItems: "start" }}>
        <div>
          {blocks.map(({ I, t, d }) => (
            <div className="cblock" key={t}>
              <span className="ci">
                <I size={20} />
              </span>
              <div>
                <b style={{ fontSize: 16 }}>{t}</b>
                <div className="muted">{d}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <a className="iconbtn" href="#" aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
            <a className="iconbtn" href="#" aria-label="Instagram">
              <Instagram size={18} />
            </a>
          </div>
        </div>
        <form className="card" style={{ padding: 32 }} onSubmit={submit}>
          <h3 style={{ fontSize: 24, marginBottom: 18 }}>Envie sua mensagem</h3>
          <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="field">
              <span>Nome</span>
              <input name="nome" required maxLength={100} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input name="email" type="email" required maxLength={255} />
            </label>
          </div>
          <label className="field">
            <span>Interesse</span>
            <select name="assunto">
              <option>Arbitragem — Nível 1</option>
              <option>Introdução à Arbitragem</option>
              <option>Parceria com escritório</option>
              <option>Outro assunto</option>
            </select>
          </label>
          <label className="field">
            <span>Mensagem</span>
            <textarea name="msg" rows={5} required maxLength={2000} />
          </label>
          <button className="btn wide lg" type="submit">
            Enviar mensagem
          </button>
          {sent && <p className="muted sm" style={{ marginTop: 12 }}>Abrimos seu aplicativo de e-mail com a mensagem pronta.</p>}
        </form>
      </section>
    </SiteShell>
  );
}
