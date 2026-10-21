import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ArrowRight, BookOpen, Files } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import coverTeorico from "@/assets/cover-teorico.jpg";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAccount } from "@/lib/account";
import { accountData } from "@/lib/commerce.functions";

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
  const { user, ready } = useAccount();
  const readAccount = useServerFn(accountData);
  const account = useQuery({
    queryKey: ["account", "catalog", user?.id],
    queryFn: () => readAccount(),
    enabled: ready && Boolean(user),
  });
  const starting = Boolean(user) && account.isSuccess && account.data.orders.length === 0 && account.data.enrollments.length === 0;
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
        <span className="pillbadge soft">{starting ? "Seu primeiro passo na Empiria" : user ? "Explore seu próximo passo" : "✦ Catálogo Empiria"}</span>
        <h1 className="display">
          {starting ? <>Sua jornada começa <em>com o primeiro curso.</em></> : user ? <>Continue construindo <em>sua prática.</em></> : <>Você não assiste. <em>Você faz.</em></>}
        </h1>
        <p className="lead" style={{ margin: "0 auto 30px" }}>
          {starting ? "Que bom ter você aqui. Comece pelos fundamentos da arbitragem ou entre direto na prática de um escritório simulado. Escolha o caminho que faz sentido para o seu momento." : user ? "Encontre a formação que acompanha seu momento profissional e dê o próximo passo na sua experiência jurídica." : "Programas com correção individualizada em cada entrega — o que a faculdade não dá e o escritório só oferece a quem já contratou."}
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
        <div className="catalog-theory">
          <div className="catalog-theory-visual">
            <img src={coverTeorico} alt="Material de estudo de arbitragem" width={1024} height={640} />
            <span>Introdução à Arbitragem</span>
          </div>
          <div className="catalog-theory-copy">
            <span className="h-eyebrow">{starting ? "Por onde você quer começar?" : "Seu ponto de partida"}</span>
            <h2>Entenda o caminho.<br /><em>Depois, entre no caso.</em></h2>
            <p>Conheça as etapas de uma arbitragem e acompanhe modelos comentados antes de construir suas próprias entregas.</p>
            <div className="catalog-theory-details">
              <span><BookOpen size={18} aria-hidden="true" />8 aulas</span>
              <span><Files size={18} aria-hidden="true" />32 modelos comentados</span>
            </div>
            <Button asChild className="btn">
              <Link to="/programa/$slug" params={{ slug: "introducao-arbitragem" }}>Começar pelo teórico <ArrowRight size={18} aria-hidden="true" /></Link>
            </Button>
          </div>
        </div>
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
        <div className="catalog-interest"><p>{starting ? "Precisa de ajuda para escolher seu primeiro curso?" : "Quer conversar sobre a formação?"}</p><Link to="/interesse" search={{ curso: "" }} className="btn ghost">{starting ? "Quero orientação" : "Registrar interesse"}</Link></div>
      </section>
    </SiteShell>
  );
}
