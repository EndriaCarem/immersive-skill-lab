import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { actions, brl, fmt, subScore, useStore, type Grade, type Submission } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Administração — Empiria" },
      { name: "description", content: "Gerencie programas, atividades, inscritos e entregas." },
      { property: "og:title", content: "Administração — Empiria" },
      { property: "og:description", content: "Painel do criador da plataforma." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const state = useStore((s) => s);
  const nav = useNavigate();
  const [tab, setTab] = useState<"programas" | "inscritos" | "entregas">("programas");
  const [grading, setGrading] = useState<Submission | null>(null);
  const prog = (id: string) => state.programs.find((p) => p.id === id);

  return (
    <AppShell>
      <main className="pane">
        <div className="eyebrow">Painel administrativo</div>
        <h1>Administração</h1>
        <div className="chips">
          {(["programas", "inscritos", "entregas"] as const).map((t) => (
            <button key={t} className={`filter ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "entregas" && ` (${state.submissions.filter((s) => !s.grades).length} a corrigir)`}
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
              Criar programa
            </button>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Status</th>
                  <th>Atividades</th>
                  <th>Preço</th>
                  <th>Inscritos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.programs.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.title}</b>
                      <div className="muted sm">{p.kind} · {p.area}</div>
                    </td>
                    <td>{{ published: "Publicado", soon: "Em breve", draft: "Rascunho" }[p.status]}</td>
                    <td>{p.activities.length}</td>
                    <td>{brl(p.price)}</td>
                    <td>{state.enrollments.filter((e) => e.programId === p.id).length}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link to="/admin/programa/$id" params={{ id: p.id }} className="btn ghost sm">
                        Editar
                      </Link>{" "}
                      <button className="btn ghost sm" onClick={() => { if (confirm(`Excluir "${p.title}"?`)) { actions.deleteProgram(p.id); toast("Curso excluído", { description: p.title }); } }}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn ghost sm" style={{ marginTop: 24 }} onClick={() => confirm("Restaurar dados de exemplo?") && actions.reset()}>
              Restaurar dados de exemplo
            </button>
          </>
        )}

        {tab === "inscritos" && (
          <table className="tbl">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Programa</th>
                <th>Inscrição</th>
                <th>Progresso</th>
              </tr>
            </thead>
            <tbody>
              {state.enrollments.map((e, i) => {
                const p = prog(e.programId);
                const done = p ? p.activities.filter((a) => state.submissions.some((s) => s.activityId === a.id && s.programId === p.id && s.student === e.student)).length : 0;
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
                <th>Programa · atividade</th>
                <th>Arquivo</th>
                <th>Uso de IA</th>
                <th>Nota</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...state.submissions].reverse().map((s) => {
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
                      <div className="muted sm">{new Date(s.submittedAt).toLocaleString("pt-BR")}</div>
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

        {grading && <GradeForm sub={grading} onClose={() => setGrading(null)} />}
      </main>
    </AppShell>
  );
}

function GradeForm({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const activity = useStore((s) => s.programs.find((p) => p.id === sub.programId)?.activities.find((a) => a.id === sub.activityId));
  const [grades, setGrades] = useState<Grade[]>(
    () => activity?.rubric.map((r) => sub.grades?.find((g) => g.criterion === r.criterion) ?? { criterion: r.criterion, score: 7, comment: "" }) ?? [],
  );
  const [comment, setComment] = useState(sub.teacherComment ?? "");
  if (!activity) return null;
  return (
    <div className="panel" style={{ marginTop: 24, borderColor: "var(--plum-edge)" }}>
      <h3>
        Corrigir · {sub.student} · {activity.title}
      </h3>
      {grades.map((g, i) => (
        <div key={g.criterion} style={{ display: "grid", gridTemplateColumns: "1fr 90px 2fr", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <b className="sm">{g.criterion}</b>
          <input
            className="input"
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={g.score}
            onChange={(e) => setGrades((gs) => gs.map((x, j) => (j === i ? { ...x, score: Math.min(10, Math.max(0, Number(e.target.value))) } : x)))}
          />
          <input className="input" placeholder="O que a correção observou" value={g.comment} onChange={(e) => setGrades((gs) => gs.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)))} />
        </div>
      ))}
      <label className="field">
        <span>Comentário geral</span>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <button
        className="btn"
        onClick={() => {
          actions.grade(sub.id, grades, comment);
          toast.success("Correção salva", { description: `${sub.student} · ${activity.title}` });
          onClose();
        }}
      >
        Salvar correção
      </button>{" "}
      <button className="btn ghost" onClick={onClose}>
        Cancelar
      </button>
    </div>
  );
}
