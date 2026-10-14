import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ActivityRail } from "@/components/ActivityLayout";
import { actions, completedCount, fmt, programAverage, useStore } from "@/lib/store";

export const Route = createFileRoute("/meus-programas")({
  head: () => ({
    meta: [
      { title: "Meus programas — Empiria" },
      { name: "description", content: "Seus programas, progresso por atividade, anotações e certificados." },
      { property: "og:title", content: "Meus programas — Empiria" },
      { property: "og:description", content: "Acompanhe seu progresso e seus certificados." },
    ],
  }),
  component: Portal,
});

function Portal() {
  const state = useStore((s) => s);
  const nav = useNavigate();
  const [note, setNote] = useState("");
  const mine = state.programs.filter((p) => state.enrollments.some((e) => e.programId === p.id && e.student === state.student));
  const certs = state.certificates.filter((c) => c.student === state.student);
  const notes = state.notes;

  return (
    <AppShell>
      <div className="body">
        <aside className="rail">
          <label className="field">
            <span>Seu nome no certificado</span>
            <input value={state.student} onChange={(e) => actions.setStudent(e.target.value)} />
          </label>
          <h4>Certificados conquistados</h4>
          {certs.length === 0 && <p className="muted sm">Nenhum ainda. Conclua um programa para emitir.</p>}
          <div className="files">
            {certs.map((c) => (
              <Link key={c.code} to="/certificado/$code" params={{ code: c.code }} className="file">
                <span className="ic">CERT</span>
                {state.programs.find((p) => p.id === c.programId)?.title}
                <span className="dl">Ver</span>
              </Link>
            ))}
          </div>
          <h4>Minhas anotações</h4>
          {notes.map((n) => (
            <div className="note" key={n.id} style={{ marginBottom: 8 }}>
              <div className="ts">
                {state.programs.find((p) => p.id === n.programId)?.title} · {new Date(n.at).toLocaleDateString("pt-BR")}
              </div>
              {n.text}
            </div>
          ))}
          {mine[0] && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input className="input" value={note} placeholder="Nova anotação…" onChange={(e) => setNote(e.target.value)} />
              <button
                className="btn sm"
                onClick={() => {
                  if (note.trim() && mine[0]) actions.addNote(mine[0].id, mine[0].activities[0]?.id ?? "", note.trim());
                  setNote("");
                }}
              >
                Salvar
              </button>
            </div>
          )}
        </aside>
        <main className="pane">
          <div className="eyebrow">Portal do aluno</div>
          <h1>Meus programas</h1>
          {mine.length === 0 && (
            <p>
              Você ainda não está inscrito. <Link to="/" style={{ color: "var(--plum)", fontWeight: 600 }}>Ver catálogo</Link>
            </p>
          )}
          {mine.map((p) => {
            const done = completedCount(state, p);
            const total = p.activities.length;
            const finished = total > 0 && done === total;
            const cert = certs.find((c) => c.programId === p.id);
            return (
              <div className="panel" key={p.id}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div className="eyebrow">{finished ? "Concluído" : "Em andamento"}</div>
                    <h3>{p.title}</h3>
                    <p className="muted sm">
                      {done} de {total} concluídas · média {fmt(programAverage(state, p))}
                    </p>
                  </div>
                  <div style={{ marginLeft: "auto", minWidth: 190 }}>
                    <div className="track">
                      <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
                <ActivityRail program={p} current={done} />
                <div style={{ marginTop: 14 }}>
                  {finished ? (
                    <button className="btn" onClick={() => nav({ to: "/certificado/$code", params: { code: cert?.code ?? actions.issueCertificate(p.id) } })}>
                      {cert ? "Ver certificado" : "Emitir certificado"}
                    </button>
                  ) : (
                    <Link to="/estagio/$slug/$n/caso" params={{ slug: p.slug, n: String(done + 1) }} className="btn">
                      Continuar atividade {done + 1}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </AppShell>
  );
}
