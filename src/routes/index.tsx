import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Star } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { useStore } from "@/lib/store";
import art from "@/assets/art-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Empiria — Formação jurídica prática em arbitragem" },
      { name: "description", content: "Não é um curso sobre arbitragem; é o que você redige quando o caso chega. Casos reais, correção individual e certificado com nota." },
      { property: "og:title", content: "Empiria — Formação jurídica prática" },
      { property: "og:description", content: "Não é um curso sobre arbitragem; é o que você redige quando o caso chega." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const programs = useStore((s) => s.programs);
  const featured = programs.filter((p) => p.status === "published").slice(0, 3);
  return (
    <SiteShell>
      <section className="wrap grid2" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center", paddingTop: 64, paddingBottom: 56 }}>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pillbadge">✦ Formação Jurídica Prática</span>
            <span className="pillbadge soft">Pré-venda Fenalaw</span>
          </div>
          <h1 className="display">
            O que você <em>redige</em> quando o caso chega.
          </h1>
          <p className="lead">
            Não é um curso sobre arbitragem. Você assume uma banca fictícia, recebe as demandas da sócia, entrega a peça e é corrigido
            critério a critério.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 30, flexWrap: "wrap" }}>
            <Link to="/programa/$slug" params={{ slug: "arbitragem-nivel-1" }} className="btn lg">
              Garantir vaga na pré-venda
            </Link>
            <Link to="/sobre" className="btn ghost lg">
              Conhecer o método
            </Link>
          </div>
        </div>
        <div className="bento">
          <div className="b img">
            <img src={art} alt="" width={1200} height={912} />
            <div className="float">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="avs">
                  <i>RF</i>
                  <i>TM</i>
                  <i>+</i>
                </div>
                <Star size={16} fill="#E2B33C" color="#E2B33C" />
                <b>8,4</b>
              </div>
              <div style={{ fontWeight: 700, marginTop: 6 }}>+300 alunos formados</div>
            </div>
          </div>
          <div className="b dark">
            <div className="metric">8,4</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#DCCFE2" }}>Nota média nas entregas corrigidas</div>
          </div>
          <div className="b">
            <div className="metric">100%</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "var(--slate)" }}>Prática real: caso, demanda, devolutiva e gabarito</div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="statbar">
          <div>
            <b>+300</b>
            <span>Alunos formados</span>
          </div>
          <div>
            <b>{programs.filter((p) => p.status === "published").length}</b>
            <span>Cursos práticos e teóricos</span>
          </div>
          <div>
            <b>2</b>
            <span>Parceiros institucionais: Arbipédia e CJA/CBMA</span>
          </div>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 88 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 30 }}>
          <div>
            <span className="pillbadge soft">✦ Cursos de lançamento</span>
            <h2 className="sec-title" style={{ marginTop: 14 }}>
              Conheça os cursos
            </h2>
          </div>
          <Link to="/cursos" className="iconbtn" style={{ marginLeft: "auto", width: 56, height: 56, background: "var(--grad)", color: "var(--paper)" }} aria-label="Ver todos os cursos">
            <ArrowUpRight />
          </Link>
        </div>
        <div className="cards">
          {featured.map((p) => (
            <CourseCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 88 }}>
        <div className="grid2" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {[
            ["01", "O caso", "O contexto chega antes da demanda, como no escritório."],
            ["02", "A demanda", "A sócia pede a peça. Sem roteiro, com o assistente de ofício."],
            ["03", "A devolutiva", "Correção por rubrica, critério a critério, com nota."],
            ["04", "O gabarito", "Peça de referência e debriefing — só depois da entrega."],
          ].map(([n, t, d]) => (
            <div key={n} className="card">
              <div className="kind">{n}</div>
              <h3>{t}</h3>
              <p style={{ marginBottom: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
