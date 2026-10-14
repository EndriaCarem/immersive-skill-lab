import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { brl, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catálogo — Empiria" },
      { name: "description", content: "Simulações profissionais de trabalho com correção individual em cada entrega e certificado com nota." },
      { property: "og:title", content: "Catálogo — Empiria" },
      { property: "og:description", content: "Você não assiste. Você faz, entrega e é corrigido." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const programs = useStore((s) => s.programs.filter((p) => p.status !== "draft"));
  const [area, setArea] = useState("Todas");
  const [q, setQ] = useState("");
  const areas = useMemo(() => ["Todas", ...Array.from(new Set(programs.map((p) => p.area)))], [programs]);
  const list = programs.filter(
    (p) =>
      (area === "Todas" || p.area === area) &&
      (p.title + p.tagline + p.kind + p.skills.join(" ")).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <AppShell>
      <main className="pane">
        <div className="eyebrow">Catálogo</div>
        <h1>Você não assiste. Você faz, entrega e é corrigido.</h1>
        <p className="quote" style={{ maxWidth: 720 }}>Não é um curso sobre arbitragem; é o que você redige quando o caso chega.</p>
        <p className="muted" style={{ maxWidth: 640 }}>
          Programas com correção individualizada em cada entrega — o que a faculdade não dá e o escritório só oferece a quem já contratou.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "22px 0 24px" }}>
          <input className="input" style={{ maxWidth: 320 }} placeholder="Buscar programa ou habilidade…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {areas.map((a) => (
              <button key={a} className={`filter ${a === area ? "on" : ""}`} onClick={() => setArea(a)}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="cards">
          {list.map((p) => (
            <div key={p.id} className={`card ${p.status === "soon" ? "soon" : ""}`}>
              <div className="kind">{p.status === "soon" ? "Em breve" : p.kind}</div>
              <h3>{p.title}</h3>
              <p>{p.tagline}</p>
              <div className="price">
                {brl(p.price)}
                {p.fullPrice ? <s>{brl(p.fullPrice)}</s> : null}
              </div>
              {p.fullPrice ? <div className="badge" style={{ alignSelf: "flex-start" }}>Pré-venda</div> : null}
              {p.status === "soon" ? (
                <button className="btn ghost wide" onClick={() => alert("Avisaremos você quando o programa abrir.")}>
                  Avise-me
                </button>
              ) : (
                <Link to="/programa/$slug" params={{ slug: p.slug }} className="btn ghost wide">
                  Ver o programa
                </Link>
              )}
            </div>
          ))}
          {list.length === 0 && <p className="muted">Nenhum programa encontrado.</p>}
        </div>
      </main>
    </AppShell>
  );
}
