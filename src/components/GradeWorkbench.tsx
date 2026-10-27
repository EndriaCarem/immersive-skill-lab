import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Rich, textToHtml } from "@/components/Rich";
import { avg, fmt, type Grade, type Submission, type Program } from "@/lib/store";
import { gradeLearningSubmission, learningFileUrl } from "@/lib/learning.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const CRITERION_SNIPPETS = [
  "Fundamentação sólida e bem articulada.",
  "Faltou enfrentar o argumento da parte contrária.",
  "Pedidos claros e tecnicamente corretos.",
  "Revisar a estrutura: tópicos fora de ordem.",
  "Citação de regulamento/lei precisa ser conferida.",
  "Linguagem objetiva, adequada à praxe da câmara.",
];
const GENERAL_SNIPPETS = [
  "Peça consistente — siga para a próxima demanda com o mesmo rigor.",
  "Compare sua peça com o gabarito comentado, especialmente na fundamentação.",
  "Atenção ao prazo e à forma de protocolo indicados na demanda.",
  "Bom domínio do procedimento; refine a redação dos pedidos.",
];
const QUICK = [4, 5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10];

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);
const append = (base: string, s: string) => (base.includes(s) ? base : base ? `${base.trim()} ${s}` : s);

export function GradeWorkbench({ sub, queue, programs, onChange, onClose }: { sub: Submission | null; queue: Submission[]; programs: Program[]; onChange: (s: Submission) => void; onClose: () => void }) {
  return (
    <Sheet open={!!sub} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="wb-sheet">
        {sub && <Body key={sub.id} sub={sub} queue={queue} programs={programs} onChange={onChange} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({ sub, queue, programs, onChange, onClose }: { sub: Submission; queue: Submission[]; programs: Program[]; onChange: (s: Submission) => void; onClose: () => void }) {
  const program = programs.find(p => p.id === sub.programId);
  const grade = useServerFn(gradeLearningSubmission);
  const fileUrl = useServerFn(learningFileUrl);
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  const activity = program?.activities.find((a) => a.id === sub.activityId);
  const [grades, setGrades] = useState<Grade[]>(
    () => activity?.rubric.map((r) => sub.grades?.find((g) => g.criterion === r.criterion) ?? { criterion: r.criterion, score: 7, comment: "" }) ?? [],
  );
  const [comment, setComment] = useState(sub.teacherComment ?? "");
  const [view, setView] = useState<"entrega" | "demanda" | "gabarito">("entrega");
  const [focus, setFocus] = useState(0);
  const mean = avg(grades.map((g) => g.score));
  const idx = queue.findIndex((q) => q.id === sub.id);
  const next = idx >= 0 ? queue[idx + 1] : undefined;
  const prev = idx > 0 ? queue[idx - 1] : undefined;

  const set = (i: number, patch: Partial<Grade>) => setGrades((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const save = async (goNext: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      await grade({ data: { id: sub.id, grades, teacherComment: comment } });
      await client.invalidateQueries({ queryKey: ["admin-learning"] });
      await client.invalidateQueries({ queryKey: ["learner-progress"] });
      toast.success("Correção salva", { description: `${sub.student} · nota ${fmt(mean)}` });
      if (goNext && next) onChange(next); else onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar a correção."); }
    finally { setSaving(false); }
  };

  // Keyboard: 0-9 sets focused criterion score (0 = 10), ↑/↓ move criterion, Ctrl+Enter saves & next.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); save(true); return; }
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (/^[0-9]$/.test(e.key)) set(focus, { score: e.key === "0" ? 10 : Number(e.key) });
      if (e.key === "ArrowDown") { e.preventDefault(); setFocus((f) => Math.min(grades.length - 1, f + 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocus((f) => Math.max(0, f - 1)); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const docHtml = useMemo(() => {
    if (!activity) return "";
    if (view === "demanda") return activity.demandHtml || textToHtml(activity.demandBody);
    if (view === "gabarito") return activity.answerHtml || textToHtml(activity.answerIntro);
    return "";
  }, [view, activity]);

  if (!activity || !program) return <p className="muted">Atividade não encontrada.</p>;

  return (
    <div className="wb">
      <SheetHeader className="wb-head">
        <div className="eyebrow">Workbench de avaliação {idx >= 0 && `· ${idx + 1} de ${queue.length}`}</div>
        <SheetTitle className="wb-title">{sub.student}</SheetTitle>
        <SheetDescription>{program.title} · {activity.title}</SheetDescription>
      </SheetHeader>

      <div className="wb-grid">
        <section className="wb-left">
          <div className="chips">
            {(["entrega", "demanda", "gabarito"] as const).map((v) => (
              <button key={v} className={`filter ${view === v ? "on" : ""}`} onClick={() => setView(v)}>
                {{ entrega: "Peça entregue", demanda: "A demanda", gabarito: "Gabarito" }[v]}
              </button>
            ))}
          </div>
          {view === "entrega" ? (
            <div className="wb-doc">
              <div className="wb-file">
                <span className="wb-ext">{sub.fileName.split(".").pop()?.toUpperCase().slice(0, 4) || "DOC"}</span>
                <div>
                  <b>{sub.fileName}</b>
                  <div className="muted sm">{kb(sub.fileSize)} · enviada em {new Date(sub.submittedAt).toLocaleString("pt-BR")}</div>
                </div>
              </div>
              <dl className="wb-meta">
                <dt>Uso de IA declarado</dt><dd>{sub.aiUse || "—"}</dd>
                <dt>Status</dt><dd>{sub.grades ? `Corrigida · nota ${fmt(avg(sub.grades.map((g) => g.score)))}` : "Aguardando correção"}</dd>
                <dt>Critérios da rubrica</dt><dd>{activity.rubric.length}</dd>
              </dl>
              <Button className="btn ghost" onClick={async () => {
                try { window.location.assign(await fileUrl({ data: { id: sub.id } })); }
                catch { toast.error("Não foi possível abrir o arquivo."); }
              }}>Baixar peça entregue</Button>
            </div>
          ) : (
            <div className="wb-doc"><Rich html={docHtml || "<p>Sem conteúdo cadastrado.</p>"} /></div>
          )}
        </section>

        <section className="wb-right">
          <div className="wb-score">
            <span>Nota final</span>
            <b>{fmt(mean)}</b>
          </div>
          {grades.map((g, i) => (
            <div key={g.criterion} className={`wb-crit ${focus === i ? "on" : ""}`} onClick={() => setFocus(i)}>
              <div className="wb-crit-top">
                <b>{g.criterion}</b>
                <span className="wb-val">{fmt(g.score)}</span>
              </div>
              <div className="wb-quick">
                {QUICK.map((n) => (
                  <button key={n} className={g.score === n ? "on" : ""} onClick={() => set(i, { score: n })}>{String(n).replace(".", ",")}</button>
                ))}
              </div>
              <input type="range" min={0} max={10} step={0.5} value={g.score} onChange={(e) => set(i, { score: Number(e.target.value) })} />
              <input className="input" placeholder="O que a correção observou" value={g.comment} onChange={(e) => set(i, { comment: e.target.value })} />
              {focus === i && (
                <div className="wb-snips">
                  {CRITERION_SNIPPETS.map((s) => (
                    <button key={s} onClick={() => set(i, { comment: append(g.comment, s) })}>+ {s}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <label className="field">
            <span>Devolutiva geral ao aluno</span>
            <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          <div className="wb-snips">
            {GENERAL_SNIPPETS.map((s) => (
              <button key={s} onClick={() => setComment((c) => append(c, s))}>+ {s}</button>
            ))}
          </div>
          <p className="muted sm" style={{ margin: "10px 0" }}>Atalhos: ↑/↓ escolhe o critério · 1–9 dá a nota (0 = 10) · Ctrl+Enter salva e avança</p>
        </section>
      </div>

      <div className="wb-foot">
        <button className="btn ghost sm" disabled={!prev} onClick={() => prev && onChange(prev)}>← Anterior</button>
        <button className="btn ghost sm" disabled={!next} onClick={() => next && onChange(next)}>Pular →</button>
        <span style={{ flex: 1 }} />
        <Button className="btn ghost" disabled={saving} onClick={() => save(false)}>Salvar</Button>
        <Button className="btn" disabled={saving} onClick={() => save(true)}>{saving ? "Salvando…" : next ? "Salvar e próxima" : "Salvar e fechar"}</Button>
      </div>
    </div>
  );
}
