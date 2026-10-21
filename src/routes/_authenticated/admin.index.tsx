import { adminGuard } from "@/lib/admin-guard";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GradeWorkbench } from "@/components/GradeWorkbench";
import { toast } from "sonner";
import {
  actions,
  brl,
  fmt,
  subScore,
  useStore,
  type Submission,
  slaStatus,
  SLA_HOURS,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: adminGuard,
  head: () => ({
    meta: [
      { title: "Administração — Empiria" },
      { name: "description", content: "Gerencie programas, atividades, inscritos e entregas." },
      { property: "og:title", content: "Administração — Empiria" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Painel do criador da plataforma." },
    ],
  }),
  component: Admin,
});

type Tab = "programas" | "inscritos" | "entregas";
const TAB_LABEL: Record<Tab, string> = {
  programas: "Cursos",
  inscritos: "Alunos inscritos",
  entregas: "Fila de correção",
};
const STATUS_LABEL = { published: "Publicado", soon: "Em breve", draft: "Rascunho" } as const;

function Admin() {
  const state = useStore((s) => s);
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("programas");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<"all" | "published" | "soon" | "draft">("all");
  const [subF, setSubF] = useState<"pending" | "graded" | "all">("pending");
  const [grading, setGrading] = useState<Submission | null>(null);
  const prog = (id: string) => state.programs.find((p) => p.id === id);
  const term = q.trim().toLowerCase();
  const has = (...xs: (string | undefined)[]) =>
    !term || xs.some((x) => x?.toLowerCase().includes(term));

  // KPIs
  const revenue = state.enrollments.reduce((sum, e) => sum + (prog(e.programId)?.price ?? 0), 0);
  const activeStudents = new Set(state.enrollments.map((e) => e.student)).size;
  const pending = state.submissions.filter((s) => !s.grades).length;
  const totalActs = state.enrollments.reduce(
    (n, e) => n + (prog(e.programId)?.activities.length ?? 0),
    0,
  );
  const doneActs = state.enrollments.reduce((n, e) => {
    const p = prog(e.programId);
    return (
      n +
      (p
        ? p.activities.filter((a) =>
            state.submissions.some(
              (s) => s.activityId === a.id && s.programId === p.id && s.student === e.student,
            ),
          ).length
        : 0)
    );
  }, 0);
  const completion = totalActs ? Math.round((doneActs / totalActs) * 100) : 0;

  const programs = state.programs.filter(
    (p) => (statusF === "all" || p.status === statusF) && has(p.title, p.area, p.kind),
  );
  const enrollments = state.enrollments.filter((e) => has(e.student, prog(e.programId)?.title));
  const subs = [...state.submissions]
    .reverse()
    .filter((s) => subF === "all" || (subF === "pending" ? !s.grades : !!s.grades))
    .filter((s) => {
      const p = prog(s.programId);
      return has(
        s.student,
        p?.title,
        p?.activities.find((a) => a.id === s.activityId)?.title,
        s.fileName,
      );
    });

  return (
    <AppShell>
      <main className="pane">
        <div className="eyebrow">Painel executivo</div>
        <h1>Administração</h1>
        <Link to="/admin/comercial" className="btn ghost">
          Operação comercial
        </Link>{" "}
        <Link to="/admin/webinars" className="btn ghost">
          Webinars
        </Link>
        <p className="muted sm">
          Conteúdo e correções abaixo são demonstrativos, salvos neste navegador. Pedidos e
          matrículas reais estão na operação comercial.
        </p>

        <div className="kpis">
          <div className="kpi">
            <small>Faturamento estimado</small>
            <b>{brl(revenue)}</b>
            <span>{state.enrollments.length} matrículas × preço atual</span>
          </div>
          <div className="kpi">
            <small>Alunos ativos</small>
            <b>{activeStudents}</b>
            <span>com ao menos uma matrícula</span>
          </div>
          <button
            className={`kpi ${pending ? "alert" : ""}`}
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={() => {
              setTab("entregas");
              setSubF("pending");
            }}
          >
            <small>Peças a avaliar</small>
            <b>{pending}</b>
            <span>{pending ? "Abrir fila de correção →" : "Fila em dia"}</span>
          </button>
          <div className="kpi">
            <small>Taxa de conclusão</small>
            <b>{completion}%</b>
            <span>
              {doneActs} de {totalActs} atividades entregues
            </span>
          </div>
        </div>

        <div className="chips">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <button key={t} className={`filter ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
              {TAB_LABEL[t]}
              {t === "entregas" && ` (${pending})`}
            </button>
          ))}
        </div>

        <div className="admbar">
          <input
            className="input"
            placeholder={
              tab === "programas"
                ? "Buscar curso, área ou tipo"
                : tab === "inscritos"
                  ? "Buscar aluno ou curso"
                  : "Buscar aluno, curso, atividade ou arquivo"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {tab === "programas" &&
            (["all", "published", "soon", "draft"] as const).map((s) => (
              <button
                key={s}
                className={`filter ${statusF === s ? "on" : ""}`}
                onClick={() => setStatusF(s)}
              >
                {s === "all" ? "Todos" : STATUS_LABEL[s]}
              </button>
            ))}
          {tab === "entregas" &&
            (
              [
                ["pending", "Aguardando correção"],
                ["graded", "Corrigidas"],
                ["all", "Todas"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                className={`filter ${subF === k ? "on" : ""}`}
                onClick={() => setSubF(k)}
              >
                {l}
              </button>
            ))}
        </div>

        {tab === "programas" && (
          <>
            <button
              className="btn"
              style={{ marginBottom: 16 }}
              onClick={() => {
                const p = actions.newProgram();
                actions.saveProgram(p);
                toast.success("Curso criado como rascunho");
                nav({ to: "/admin/programa/$id", params: { id: p.id } });
              }}
            >
              Novo curso
            </button>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Status</th>
                  <th>Atividades</th>
                  <th>Preço</th>
                  <th>Matrículas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {programs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Nenhum curso encontrado.
                    </td>
                  </tr>
                )}
                {programs.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.title}</b>
                      <div className="muted sm">
                        {p.kind} · {p.area}
                      </div>
                    </td>
                    <td>{STATUS_LABEL[p.status]}</td>
                    <td>{p.activities.length}</td>
                    <td>{brl(p.price)}</td>
                    <td>{state.enrollments.filter((e) => e.programId === p.id).length}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link to="/admin/programa/$id" params={{ id: p.id }} className="btn ghost sm">
                        Editar
                      </Link>{" "}
                      <button
                        className="btn ghost sm"
                        onClick={() => {
                          if (confirm(`Excluir "${p.title}"?`)) {
                            actions.deleteProgram(p.id);
                            toast("Curso excluído", { description: p.title });
                          }
                        }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="btn ghost sm"
              style={{ marginTop: 24 }}
              onClick={() => confirm("Restaurar dados de exemplo?") && actions.reset()}
            >
              Restaurar dados de exemplo
            </button>
          </>
        )}

        {tab === "inscritos" && (
          <table className="tbl">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Curso</th>
                <th>Matrícula</th>
                <th>Progresso</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
              {enrollments.map((e, i) => {
                const p = prog(e.programId);
                const done = p
                  ? p.activities.filter((a) =>
                      state.submissions.some(
                        (s) =>
                          s.activityId === a.id && s.programId === p.id && s.student === e.student,
                      ),
                    ).length
                  : 0;
                return (
                  <tr key={i}>
                    <td>{e.student}</td>
                    <td>{p?.title}</td>
                    <td>{new Date(e.enrolledAt).toLocaleDateString("pt-BR")}</td>
                    <td>
                      {done}/{p?.activities.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === "entregas" && (
          <table className="tbl">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Curso · atividade</th>
                <th>Peça entregue</th>
                <th>Uso de IA declarado</th>
                <th>Nota</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {subF === "pending"
                      ? "Nenhuma peça aguardando correção."
                      : "Nenhuma entrega encontrada."}
                  </td>
                </tr>
              )}
              {subs.map((s) => {
                const p = prog(s.programId);
                const a = p?.activities.find((x) => x.id === s.activityId);
                return (
                  <tr key={s.id}>
                    <td>{s.student}</td>
                    <td>
                      {p?.title}
                      <div className="muted sm">{a?.title}</div>
                    </td>
                    <td>
                      {s.fileName}
                      <div className="muted sm">
                        {new Date(s.submittedAt).toLocaleString("pt-BR")}
                      </div>
                      {!s.grades &&
                        (() => {
                          const sl = slaStatus(s.submittedAt);
                          return (
                            <span className={`sig ${sl.k}`} style={{ marginTop: 4 }}>
                              Entregue {sl.label} · SLA {SLA_HOURS}h
                            </span>
                          );
                        })()}
                      {!!s.humanReviews?.length && (
                        <span className="sig mid" style={{ marginTop: 4 }}>
                          {s.reviewedAt ? "Correção humana concluída" : "Correção humana pedida"}
                        </span>
                      )}
                    </td>
                    <td className="sm">{s.aiUse}</td>
                    <td>{fmt(subScore(s))}</td>
                    <td>
                      <button className="btn ghost sm" onClick={() => setGrading(s)}>
                        {s.grades ? "Revisar" : "Corrigir"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <GradeWorkbench
          sub={grading}
          queue={subs}
          onChange={setGrading}
          onClose={() => setGrading(null)}
        />
      </main>
    </AppShell>
  );
}
