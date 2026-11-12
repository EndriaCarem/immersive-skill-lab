import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminHeader, ChartCard, ChartGrid, DonutChart, HBarChart, Kpi, KpiRow, TrendChart, countPoints, dailySeries } from "@/components/admin/AdminKit";
import { supabase } from "@/integrations/supabase/client";
import { adminGuard } from "@/lib/admin-guard";
import { commerceHead } from "@/lib/commerce-schema";
import { adminPeople } from "@/lib/admin-people.functions";
import { FUNNEL, funnelStage, isInternalVisit } from "@/lib/journey";

const visitsOpts = () => queryOptions({
  queryKey: ["admin-site-visits"],
  queryFn: async () => {
    const since = new Date(Date.now() - 90 * 864e5).toISOString();
    const { data, error } = await supabase.from("site_page_visits").select("*").gte("created_at", since).order("created_at", { ascending: true }).limit(20000);
    if (error) throw new Error("Não foi possível carregar os acessos.");
    return (data ?? []).filter((v) => !isInternalVisit(v));
  },
});

export const Route = createFileRoute("/_authenticated/admin/origens")({
  beforeLoad: adminGuard,
  head: () => commerceHead("Origens e jornadas", "De onde vêm os visitantes e o caminho até a área do aluno e a compra."),
  loader: ({ context }) => context.queryClient.ensureQueryData(visitsOpts()),
  component: Origins,
});

type Journey = { visitorId: string; userId: string | null; source: string; medium: string; campaign: string; landing: string; device: string; first: string; last: string; steps: string[]; sections: Set<string> };

function Origins() {
  const { data: visits } = useSuspenseQuery(visitsOpts());
  const people = useQuery({ queryKey: ["admin-people"], queryFn: () => adminPeople() });
  const [source, setSource] = useState("all");
  const map = new Map<string, Journey>();
  for (const v of visits) {
    let j = map.get(v.visitor_id);
    if (!j) { j = { visitorId: v.visitor_id, userId: null, source: v.first_source || "direto", medium: v.first_medium, campaign: v.first_campaign, landing: v.first_landing || v.path, device: v.device, first: v.created_at, last: v.created_at, steps: [], sections: new Set() }; map.set(v.visitor_id, j); }
    j.userId = j.userId ?? v.user_id; j.last = v.created_at; j.sections.add(v.section);
    if (j.steps[j.steps.length - 1] !== v.section) j.steps.push(v.section);
  }
  const all = [...map.values()];
  const journeys = source === "all" ? all : all.filter((j) => j.source === source);
  const person = (id: string | null) => people.data?.people.find((p) => p.id === id);
  const bought = (j: Journey) => Boolean(person(j.userId)?.orders.some((o) => o.status === "paid"));
  const stages = journeys.map((j) => funnelStage(j.sections, bought(j)));
  const funnel = FUNNEL.map((name, i) => ({ name, value: stages.filter((s) => s >= i).length }));
  const ids = new Set(journeys.map((j) => j.visitorId));
  const scoped = visits.filter((v) => ids.has(v.visitor_id));
  const sources = countPoints(all, (j) => j.source);

  return (
    <AppShell>
      <main className="pane adm-page">
        <AdminHeader title="Origens e jornadas" text="Por onde cada visitante chegou e o caminho que fez no site: entrada, cursos, cadastro, área do aluno e compra. Últimos 90 dias." />
        <div className="ac-courses" role="tablist" aria-label="Origem">
          <button className={source === "all" ? "on" : ""} onClick={() => setSource("all")}>Todas as origens<span>{all.length} visitantes</span></button>
          {sources.slice(0, 6).map((s) => <button key={s.name} className={source === s.name ? "on" : ""} onClick={() => setSource(s.name)}>{s.name}<span>{s.value} visitantes</span></button>)}
        </div>
        <KpiRow>
          <Kpi label="Visitantes" value={journeys.length} hint={`${scoped.length} páginas vistas`} />
          <Kpi label="Entraram na conta" value={journeys.filter((j) => j.userId).length} />
          <Kpi label="Chegaram à área do aluno" value={funnel[3]!.value} />
          <Kpi label="Compraram" value={funnel[4]!.value} hint={journeys.length ? `${Math.round((funnel[4]!.value / journeys.length) * 1000) / 10}% dos visitantes` : undefined} />
        </KpiRow>
        <ChartGrid>
          <ChartCard title="Funil do visitante" hint="quantos chegaram a cada etapa" wide>
            <HBarChart data={funnel} />
          </ChartCard>
          <ChartCard title="Visitantes novos por dia" hint="últimos 30 dias">
            <TrendChart data={dailySeries(journeys, (j) => j.first)} />
          </ChartCard>
          <ChartCard title="Origem dos visitantes">
            <DonutChart data={sources.slice(0, 6)} />
          </ChartCard>
          <ChartCard title="Página de entrada">
            <HBarChart data={countPoints(journeys, (j) => j.landing).slice(0, 8)} />
          </ChartCard>
          <ChartCard title="Páginas mais vistas">
            <HBarChart data={countPoints(scoped, (v) => v.section).slice(0, 10)} />
          </ChartCard>
          <ChartCard title="Campanhas">
            <HBarChart data={countPoints(journeys.filter((j) => j.campaign), (j) => j.campaign).slice(0, 8)} />
          </ChartCard>
          <ChartCard title="Aparelho">
            <DonutChart data={countPoints(journeys, (j) => ({ desktop: "Computador", mobile: "Celular", tablet: "Tablet" } as Record<string, string>)[j.device] ?? "Não identificado")} />
          </ChartCard>
        </ChartGrid>
        <section className="adm-chart">
          <div className="adm-chart-hd"><h3>Jornadas recentes</h3><span>{Math.min(50, journeys.length)} de {journeys.length}</span></div>
          {!journeys.length ? <p className="adm-empty">Ainda sem visitas registradas.</p> : (
            <div className="people-table"><table className="rubric"><thead><tr><th>Visitante</th><th>Origem</th><th>Caminho</th><th>Último acesso</th></tr></thead><tbody>
              {[...journeys].sort((a, b) => b.last.localeCompare(a.last)).slice(0, 50).map((j) => {
                const p = person(j.userId);
                return <tr key={j.visitorId}>
                  <td><b>{p ? p.name || p.email : "Anônimo"}</b>{p && <div className="muted sm">{p.email}</div>}</td>
                  <td>{j.source}{j.campaign && <div className="muted sm">{j.campaign}</div>}</td>
                  <td><div className="journey-path">{j.steps.slice(0, 12).map((s, i) => <span key={i}>{s}</span>)}{bought(j) && <span className="buy">Compra</span>}</div></td>
                  <td>{new Date(j.last).toLocaleString("pt-BR")}</td>
                </tr>;
              })}
            </tbody></table></div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
