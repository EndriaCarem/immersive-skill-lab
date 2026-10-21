import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { ReviewWindow } from "@/components/ReviewWindow";
import { useStore } from "@/lib/store";
import { founders } from "@/lib/founders";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Empiria — Escritório simulado de arbitragem" },
      { name: "description", content: "Não é um curso sobre arbitragem; é o que você redige quando o caso chega. Demandas reais, revisão de sênior e nota por critério." },
      { property: "og:title", content: "Empiria — No padrão das grandes bancas" },
      { property: "og:description", content: "Não é um curso sobre arbitragem; é o que você redige quando o caso chega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

/** Backlog EMP-006: only partners confirmed by the client may appear. None confirmed yet. */
const PARTNERS: string[] = [];
const SCREENS: [string, string][] = [
  ["A demanda", "Chega por e-mail, com prazo, limite de páginas e a pasta do caso. Sem roteiro."],
  ["A entrega", "Você redige e envia. A Nidia comenta o método, mas não escreve por você."],
  ["A revisão", "Nota por critério, trechos riscados e comentários de quem supervisiona você."],
  ["O gabarito", "Trancado até o envio. Depois, peça modelo comentada e vídeo do professor."],
];
const AUDIENCE = [
  ["Estagiários e recém-formados", "Ninguém avalia o estagiário pela teoria. Chegue sabendo entregar.", "Arbitragem — Nível 1"],
  ["Advogados em transição", "Migre para a arbitragem com prática real, sem largar o que já faz.", "Introdução à Arbitragem"],
  ["Advogados com carteira própria", "Fora do eixo RJ–SP, conduza o próprio caso com segurança.", "Arbitragem — Nível 1"],
];
const FAQ = [
  ["As aulas são gravadas ou ao vivo?", "As demandas e o material ficam disponíveis no seu ritmo. A correção é individual, feita por sênior, com prazo de devolutiva."],
  ["Posso usar IA?", "Pode, desde que declare como usou. A Nidia classifica o uso sem punir e avisa quando o raciocínio foi terceirizado sem reelaboração."],
  ["Os casos são reais?", "São casos fictícios construídos a partir da prática real, sem informação confidencial de clientes."],
  ["Isso substitui um estágio?", "Não. Prepara você para o estágio, para que a primeira chance não seja o primeiro contato com o ofício."],
  ["O certificado tem validade?", "É verificável publicamente por código e traz a nota de cada critério. Não é um certificado de presença."],
  ["E se eu discordar da nota?", "Você pode pedir até duas revisões humanas por atividade."],
];

/** Rises into view on scroll and opens its description on hover/tap. */
function ProductCard({ i, t, d }: { i: number; t: string; d: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      onClick={() => setOpen((o) => !o)}
      className={`pcard${seen ? " in" : ""}${open ? " open" : ""}`}
      style={{ transitionDelay: seen && !open ? `${i * 90}ms` : undefined }}
    >
      <span className="n">0{i + 1}</span>
      <h3>{t}</h3>
      <p>{d}</p>
      <span className="hint">Toque para abrir ↑</span>
    </button>
  );
}

function Landing() {
  const programs = useStore((s) => s.programs);
  const featured = programs.filter((p) => p.status === "published").slice(0, 3);
  return (
    <SiteShell>
      <section className="wrap hero-c">
        <span className="pillbadge">Escritório simulado de arbitragem</span>
        <h1 className="display">O que você redige quando o caso chega.</h1>
        <p className="lead">Receba a demanda, entregue a peça e seja revisado por quem supervisiona, critério a critério.</p>
        <div className="hero-cta">
          <Link to="/sobre" className="btn lg">
            Ver como funciona
          </Link>
        </div>
        <div className="hero-doc"><ReviewWindow compact /></div>
      </section>

      {PARTNERS.length > 0 && (
        <section className="wrap">
          <div className="partners" aria-label="Parceiros">
            {PARTNERS.map((p) => <span key={p}>{p}</span>)}
          </div>
        </section>
      )}

      <section className="wrap h-sec">
        <div className="h-eyebrow">O produto</div>
        <h2 className="sec-title">Quatro telas, o mesmo ciclo do escritório</h2>
        <div className="g4" style={{ marginTop: 28 }}>
          {SCREENS.map(([t, d], i) => (
            <ProductCard key={t} i={i} t={t} d={d} />
          ))}
        </div>
      </section>

      <section className="wrap h-sec">
        <div className="h-eyebrow">Por que existe</div>
        <p className="essay">
          Ninguém avalia o estagiário pela teoria. Avalia pelo relatório aprovado sem reescrever, pelo e-mail correto, pelo prazo cumprido.
          Esse ofício só se aprendia dentro das grandes bancas, depois da contratação. A Empiria entrega esse preparo antes da primeira chance.
        </p>
        <div className="quote" style={{ marginTop: 28 }}>Não é um curso sobre arbitragem; é o que você redige quando o caso chega.</div>
      </section>

      <section className="wrap h-sec">
        <div className="h-eyebrow">Para quem</div>
        <h2 className="sec-title">Três pontos de partida</h2>
        <div className="g3" style={{ marginTop: 28 }}>
          {AUDIENCE.map(([t, d, c]) => (
            <div key={t} className={`tile`}>
              <h3>{t}</h3>
              <p>{d}</p>
              <p style={{ marginTop: 14, fontWeight: 700, color: "var(--plum-mid)" }}>Recomendado: {c}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap h-sec">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
          <div>
            <div className="h-eyebrow">Os cursos</div>
            <h2 className="sec-title" style={{ margin: 0 }}>Os cursos</h2>
          </div>
          <Link to="/cursos" className="btn ghost" style={{ marginLeft: "auto" }}>Ver todos os cursos</Link>
        </div>
        <div className="cards">
          {featured.map((p) => <CourseCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="wrap h-sec">
        <div className="h-eyebrow">Quem ensina</div>
        <h2 className="sec-title">Duas advogadas que dão aula e conhecem o outro lado do balcão</h2>
        <div className="teachers">
          {founders.map((f) => (
            <article key={f.name} className="teacher">
              <img src={f.photo} alt={f.name} width={120} height={120} loading="lazy" />
              <div>
                <h3>{f.name}</h3>
                <div className="role">{f.role}</div>
                <p>{f.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap h-sec faq-v3">
        <div className="h-eyebrow">Perguntas frequentes</div>
        {FAQ.slice(0, 4).map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section className="wrap h-sec" style={{ paddingBottom: 40 }}>
        <div className="final">
          <h2>A primeira demanda está esperando.</h2>
          <p>Arbitragem — Nível 1 por R$ 890 até 30/11. Depois, R$ 1.190.</p>
          <Link to="/programa/$slug" params={{ slug: "arbitragem-nivel-1" }} className="btn lg" style={{ marginTop: 16 }}>
            Garantir o preço de lançamento
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
