import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos — Empiria" },
      { name: "description", content: "Cursos práticos e teóricos de arbitragem com correção individual e certificado com nota." },
      { property: "og:title", content: "Cursos — Empiria" },
      { property: "og:description", content: "Arbitragem — Nível 1, Introdução à Arbitragem e os próximos lançamentos." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const programs = useStore((s) => s.programs);
  const [kind, setKind] = useState("Todos");
  const [q, setQ] = useState("");
  const visible = programs.filter((p) => p.status !== "draft");
  const kinds = useMemo(() => ["Todos", ...Array.from(new Set(visible.map((p) => p.kind)))], [visible]);
  const list = visible.filter(
    (p) => (kind === "Todos" || p.kind === kind) && (p.title + p.tagline + p.kind + p.skills.join(" ")).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <SiteShell>
      <section className="wrap" style={{ textAlign: "center", paddingTop: 72, paddingBottom: 36 }}>
        <span className="pillbadge soft">✦ Catálogo Empiria</span>
        <h1 className="display" style={{ fontSize: "clamp(36px,5vw,60px)" }}>
          Você não assiste. <em>Você faz.</em>
        </h1>
        <p className="lead" style={{ margin: "0 auto 30px" }}>
          Programas com correção individualizada em cada entrega — o que a faculdade não dá e o escritório só oferece a quem já contratou.
        </p>
        <label className="searchpill">
          <Search size={18} color="var(--slate)" />
          <input placeholder="Buscar curso ou habilidade…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          <span className="btn sm">Buscar</span>
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
          {kinds.map((k) => (
            <button key={k} className={`filter ${k === kind ? "on" : ""}`} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
        </div>
      </section>
      <section className="wrap">
        <div className="cards">
          {list.map((p) => (
            <CourseCard key={p.id} p={p} />
          ))}
        </div>
        {list.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>
            Nenhum curso encontrado.
          </p>
        )}
      </section>
    </SiteShell>
  );
}
