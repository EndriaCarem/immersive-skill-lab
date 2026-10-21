import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos — Empiria" },
      { name: "description", content: "Cursos práticos e teóricos de arbitragem com correção individual e certificado com nota." },
      { property: "og:title", content: "Cursos — Empiria" },
      { property: "og:description", content: "Arbitragem — Nível 1, Introdução à Arbitragem e os próximos lançamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const programs = useStore((s) => s.programs);
  const [kind, setKind] = useState("Todos");
  const [q, setQ] = useState("");
  const visible = programs.filter((p) => p.status === "published").slice(0, 2);
  const soon = programs.filter((p) => p.status === "soon");
  const kinds = useMemo(() => ["Todos", ...Array.from(new Set(visible.map((p) => p.kind)))], [visible]);
  const list = visible.filter(
    (p) => (kind === "Todos" || p.kind === kind) && (p.title + p.tagline + p.kind + p.skills.join(" ")).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <SiteShell>
      <section className="wrap public-intro">
        <span className="pillbadge soft">✦ Catálogo Empiria</span>
        <h1 className="display">
          Você não assiste. <em>Você faz.</em>
        </h1>
        <p className="lead" style={{ margin: "0 auto 30px" }}>
          Programas com correção individualizada em cada entrega — o que a faculdade não dá e o escritório só oferece a quem já contratou.
        </p>
        <label className="searchpill">
          <Search size={18} color="var(--slate)" />
          <input placeholder="Buscar curso ou habilidade…" value={q} maxLength={160} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
          {kinds.map((k) => (
            <Button variant="ghost" key={k} className={`filter ${k === kind ? "on" : ""}`} aria-pressed={k === kind} onClick={() => setKind(k)}>
              {k}
            </Button>
          ))}
        </div>
      </section>
      <section className="wrap">
        <div className="cards cards-center">
          {list.map((p) => (
            <CourseCard key={p.id} p={p} />
          ))}
        </div>
        {list.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>
            Nenhum curso encontrado.
          </p>
        )}
        <div className="soon-box">
          <div className="soon-stack" aria-hidden="true"><span /><span /><span /></div>
          <div className="soon-copy">
            <span className="pillbadge soft">✦ Em breve</span>
            <h2>Mais cursos estão sendo redigidos.</h2>
            <p>Novas áreas e novos níveis chegam ao catálogo nos próximos meses.</p>
            {soon.length > 0 && (
              <div className="soon-tags">{soon.map((p) => <span key={p.id}>{p.title}</span>)}</div>
            )}
            <Link to="/interesse" search={{ curso: "" }} className="btn">Quero ser avisado</Link>
          </div>
        </div>
        <div className="catalog-interest"><p>Quer conversar sobre a formação?</p><Link to="/interesse" search={{ curso: "" }} className="btn ghost">Registrar interesse</Link></div>
      </section>
    </SiteShell>
  );
}
