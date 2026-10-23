import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { InterestForm } from "@/components/InterestForm";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Fale com a Empiria — Contato e dúvidas" },
      { name: "description", content: "Tire suas dúvidas sobre a formação: e-mail, WhatsApp de matrícula e formulário de contato." },
      { property: "og:title", content: "Fale com a Empiria" },
      { property: "og:description", content: "Tire suas dúvidas sobre a formação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

const EMAIL = "atendimento@empiria-law.com";

function Contact() {
  const blocks = [
    { I: Mail, t: "E-mail", d: EMAIL },
  ];
  return (
    <SiteShell>
      <section className="wrap public-intro">
        <span className="pillbadge soft">✦ Fale conosco</span>
        <h1 className="display">
          Fale com a <em>Empiria</em>
        </h1>
        <p className="lead" style={{ margin: "0 auto" }}>
          Tire suas dúvidas sobre a formação, a pré-venda ou parcerias com escritórios.
        </p>
      </section>
      <section className="wrap contact-layout">
        <div>
          {blocks.map(({ I, t, d }) => (
            <div className="cblock" key={t}>
              <span className="ci">
                <I size={20} />
              </span>
              <div>
                <b style={{ fontSize: 16 }}>{t}</b>
                <div><a className="muted" href={`mailto:${d}`}>{d}</a></div>
              </div>
            </div>
          ))}
        </div>
        <InterestForm source="contact" />
      </section>
    </SiteShell>
  );
}
