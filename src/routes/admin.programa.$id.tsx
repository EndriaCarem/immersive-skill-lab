import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, type Activity, type Doc, type Program } from "@/lib/store";

export const Route = createFileRoute("/admin/programa/$id")({
  head: () => ({
    meta: [
      { title: "Editar programa — Praxis Formação Prática" },
      { name: "description", content: "Configure programa, atividades, caso, demanda, devolutiva e gabarito." },
      { property: "og:title", content: "Editar programa — Praxis Formação Prática" },
      { property: "og:description", content: "Editor de programas e atividades." },
    ],
  }),
  component: Editor,
});

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const docsToText = (d: Doc[]) => d.map((x) => x.name).join("\n");
const textToDocs = (s: string, old: Doc[]) => lines(s).map((name) => old.find((o) => o.name === name) ?? { name, content: name });

function Editor() {
  const { id } = Route.useParams();
  const stored = useStore((s) => s.programs.find((p) => p.id === id));
  const [p, setP] = useState<Program | null>(stored ?? null);
  const [open, setOpen] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (stored && !p) setP(stored);
  }, [stored, p]);
  if (!p)
    return (
      <AppShell>
        <main className="pane">
          <h1>Programa não encontrado</h1>
          <Link to="/admin" className="btn">Voltar</Link>
        </main>
      </AppShell>
    );
  const up = (patch: Partial<Program>) => {
    setSaved(false);
    setP({ ...p, ...patch });
  };
  const upA = (i: number, patch: Partial<Activity>) => up({ activities: p.activities.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const move = (i: number, d: number) => {
    const a = [...p.activities];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    up({ activities: a });
    setOpen(j);
  };

  return (
    <AppShell>
      <div className="proghead">
        <div>
          <div className="eyebrow">Editor de programa</div>
          <h2>{p.title}</h2>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span className="muted sm">Salvo ✓</span>}
          <Link to="/admin" className="btn ghost sm">Voltar</Link>
          <button className="btn sm" onClick={() => { actions.saveProgram(p); setSaved(true); }}>
            Salvar programa
          </button>
        </div>
      </div>
      <div className="body">
        <aside className="rail">
          <T l="Título" v={p.title} on={(v) => up({ title: v })} />
          <T l="Endereço (slug)" v={p.slug} on={(v) => up({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
          <T l="Área" v={p.area} on={(v) => up({ area: v })} />
          <T l="Tipo" v={p.kind} on={(v) => up({ kind: v })} />
          <label className="field">
            <span>Status</span>
            <select value={p.status} onChange={(e) => up({ status: e.target.value as Program["status"] })}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="soon">Em breve</option>
            </select>
          </label>
          <label className="field">
            <span>Preço (R$)</span>
            <input type="number" value={p.price ?? ""} onChange={(e) => up({ price: e.target.value === "" ? null : Number(e.target.value) })} />
          </label>
          <T l="Chamada no catálogo" v={p.tagline} on={(v) => up({ tagline: v })} area />
          <T l="Apresentação" v={p.description} on={(v) => up({ description: v })} area />
          <T l="Habilidades (uma por linha)" v={p.skills.join("\n")} on={(v) => up({ skills: lines(v) })} area />
        </aside>
        <main className="pane">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Atividades</h3>
            <button
              className="btn sm"
              style={{ marginLeft: "auto" }}
              onClick={() => { up({ activities: [...p.activities, actions.newActivity(p.activities.length + 1)] }); setOpen(p.activities.length); }}
            >
              Adicionar atividade
            </button>
          </div>
          {p.activities.map((a, i) => (
            <div className="panel" key={a.id}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="num">{i + 1}</span>
                <button style={{ fontWeight: 600, textAlign: "left", flex: 1 }} onClick={() => setOpen(open === i ? -1 : i)}>
                  {a.title} <span className="muted sm">· {a.duration}</span>
                </button>
                <button className="btn ghost sm" onClick={() => move(i, -1)} aria-label="Subir">↑</button>
                <button className="btn ghost sm" onClick={() => move(i, 1)} aria-label="Descer">↓</button>
                <button className="btn ghost sm" onClick={() => up({ activities: p.activities.filter((_, j) => j !== i) })}>Remover</button>
              </div>
              {open === i && (
                <div style={{ marginTop: 16 }}>
                  <T l="Título" v={a.title} on={(v) => upA(i, { title: v })} />
                  <T l="Título curto" v={a.shortTitle} on={(v) => upA(i, { shortTitle: v })} />
                  <T l="Duração" v={a.duration} on={(v) => upA(i, { duration: v })} />
                  <T l="Resumo" v={a.summary} on={(v) => upA(i, { summary: v })} />
                  <h4>1 · O caso</h4>
                  <T l="Briefing (um parágrafo por linha)" v={a.caseParagraphs.join("\n")} on={(v) => upA(i, { caseParagraphs: lines(v) })} area />
                  <T l="Nota de contexto" v={a.caseNote} on={(v) => upA(i, { caseNote: v })} area />
                  <T l="Documentos anexos (um por linha)" v={docsToText(a.attachments)} on={(v) => upA(i, { attachments: textToDocs(v, a.attachments) })} area />
                  <h4>2 · A demanda</h4>
                  <T l="De" v={a.demandFrom} on={(v) => upA(i, { demandFrom: v })} />
                  <T l="Assunto" v={a.demandSubject} on={(v) => upA(i, { demandSubject: v })} />
                  <T l="Instrução" v={a.demandBody} on={(v) => upA(i, { demandBody: v })} area />
                  <T l="Legenda do vídeo" v={a.demandVideoCaption} on={(v) => upA(i, { demandVideoCaption: v })} />
                  <T l="Orientação de envio" v={a.uploadHint} on={(v) => upA(i, { uploadHint: v })} />
                  <h4>3 · Devolutiva</h4>
                  <T l="Orientação imediata" v={a.feedbackGuidance} on={(v) => upA(i, { feedbackGuidance: v })} area />
                  <T l="Pontos de reflexão (um por linha)" v={a.reflectionPoints.join("\n")} on={(v) => upA(i, { reflectionPoints: lines(v) })} area />
                  <T l="Critérios da rubrica (um por linha)" v={a.rubric.map((r) => r.criterion).join("\n")} on={(v) => upA(i, { rubric: lines(v).map((criterion) => ({ criterion })) })} area />
                  <h4>4 · Gabarito</h4>
                  <T l="Link do vídeo de debriefing (opcional)" v={a.answerVideoUrl} on={(v) => upA(i, { answerVideoUrl: v })} />
                  <T l="Legenda do vídeo" v={a.answerVideoCaption} on={(v) => upA(i, { answerVideoCaption: v })} />
                  <T l="Competências esperadas" v={a.answerIntro} on={(v) => upA(i, { answerIntro: v })} area />
                  <T l="Peça de referência — nome" v={a.referenceDoc.name} on={(v) => upA(i, { referenceDoc: { ...a.referenceDoc, name: v } })} />
                  <T l="Peça de referência — descrição" v={a.referenceDoc.description} on={(v) => upA(i, { referenceDoc: { ...a.referenceDoc, description: v } })} />
                  <T l="Peça de referência — conteúdo" v={a.referenceDoc.content} on={(v) => upA(i, { referenceDoc: { ...a.referenceDoc, content: v } })} area />
                  <T l="Material de guia (um por linha)" v={docsToText(a.guideDocs)} on={(v) => upA(i, { guideDocs: textToDocs(v, a.guideDocs) })} area />
                </div>
              )}
            </div>
          ))}
          {p.activities.length === 0 && <p className="muted">Nenhuma atividade ainda.</p>}
        </main>
      </div>
    </AppShell>
  );
}

function T({ l, v, on, area }: { l: string; v: string; on: (v: string) => void; area?: boolean }) {
  return (
    <label className="field">
      <span>{l}</span>
      {area ? <textarea rows={4} value={v} onChange={(e) => on(e.target.value)} /> : <input value={v} onChange={(e) => on(e.target.value)} />}
    </label>
  );
}
