import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { LearnerShell } from "./LearnerShell";
import { fmt, type Activity, type Program } from "@/lib/store";
import { deliveryStatusLabel } from "@/lib/ai-grading-rules";
import { useLearning } from "@/lib/learning";
import { canOpenActivity, currentSubmission, learningProgress } from "@/lib/learning-rules";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { addLearningNote } from "@/lib/learning.functions";
import { Button } from "./ui/button";
import { toast } from "sonner";

export function useActivity(slug: string, n: string) {
  const learning = useLearning();
  const program = learning.data?.programs.find(p => p.slug === slug);
  const idx = Number(n) - 1;
  const activity = program?.activities[idx];
  const allowed = program && activity && canOpenActivity(program, learning.data?.submissions ?? [], idx);
  return { program: allowed ? program : undefined, activity: allowed ? activity : undefined, idx };
}

export function NotFoundBlock() {
  const learning = useLearning();
  return (
    <AppShell>
      <div className="pane">
        <h1>{!learning.ready || learning.isLoading ? "Carregando atividades…" : learning.error ? "Não foi possível carregar suas atividades" : !learning.user ? "Entre para acessar suas atividades" : "Atividade indisponível"}</h1>
        <Link to={learning.user ? "/meus-programas" : "/auth"} className="btn">
          {learning.user ? "Meus programas" : "Entrar"}
        </Link>
      </div>
    </AppShell>
  );
}

export function ActivityRail({ program, current }: { program: Program; current: number }) {
  const { data } = useLearning();
  const submissions = data?.submissions ?? [];
  return (
    <ul className="acts">
      {program.activities.map((a, i) => {
        const sub = currentSubmission(submissions, program.id, a.id);
        const unlocked = canOpenActivity(program, submissions, i);
        const cls = sub ? "done" : i === current ? "now" : unlocked ? "" : "locked";
        return (
          <li key={a.id} className={cls}>
            <span className="num">{sub ? "✓" : i + 1}</span>
            <span>
              {unlocked ? (
                <Link to="/estagio/$slug/$n/caso" params={{ slug: program.slug, n: String(i + 1) }} className="ttl">
                  {a.shortTitle}
                </Link>
              ) : (
                <span className="ttl">{a.shortTitle}</span>
              )}
              <div className="meta">
                {sub ? deliveryStatusLabel(sub, fmt) : i === current ? "Em andamento" : unlocked ? "Disponível agora" : a.duration}
              </div>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityLayout({
  program,
  activity,
  idx,
  rail,
  children,
  hideActivities = false,
}: {
  program: Program;
  activity: Activity;
  idx: number;
  rail?: ReactNode;
  children: ReactNode;
  hideActivities?: boolean;
}) {
  const { data } = useLearning();
  const done = learningProgress(program, data?.submissions ?? []).done;
  const pct = program.activities.length ? (done / program.activities.length) * 100 : 0;
  const path = useLocation({ select: l => l.pathname });
  const stepKeys = ["caso", "demanda", "devolutiva", "gabarito"];
  const step = Math.max(0, stepKeys.findIndex(k => path.endsWith(`/${k}`)));
  const n = String(idx + 1);
  return (
    <LearnerShell sidebar={hideActivities ? undefined : <><div className="learner-sidebar-label">{program.title}</div><ActivityRail program={program} current={idx} /></>}>
      <div className="proghead">
        <div>
          <div className="eyebrow">
            {program.kind.split(" ")[0]} · {program.title}
          </div>
          <h2>
            <span className="proghead-num">Atividade {idx + 1}</span>
            {activity.title}
          </h2>
        </div>
        <div className="progress">
          <div className="lbl">
            {done} de {program.activities.length} concluídas
          </div>
          <div className="track">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <nav className="activity-steps" aria-label="Etapas da atividade">
        {STEP_PATHS.map((to, i) => (
          <Link key={to} to={to} params={{ slug: program.slug, n }} className={i === step ? "on" : i < step ? "past" : ""} aria-current={i === step ? "step" : undefined}>
            <b>{i + 1}</b><span>{STEP_LABELS[i]}</span>
          </Link>
        ))}
      </nav>
      <div className={`body${rail ? "" : " solo"}`}>
        {rail && <aside className="rail">{rail}</aside>}
        <main className="pane">{children}<LearningNotes program={program} activity={activity} /></main>
      </div>
    </LearnerShell>
  );
}

function LearningNotes({ program, activity }: { program: Program; activity: Activity }) {
  const learning = useLearning();
  const save = useServerFn(addLearningNote);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const notes = learning.data?.notes.filter(n => n.program_id === program.id && n.activity_id === activity.id) ?? [];
  return <details className="learner-notes" open={notes.length > 0 || undefined}>
    <summary>Minhas anotações <span>{notes.length ? `${notes.length} salva${notes.length > 1 ? "s" : ""}` : "Abrir"}</span></summary>
    {notes.map(n => <p key={n.id}>{n.text}</p>)}
    <label className="field"><span>Nova anotação</span><textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={10000} /></label>
    <Button className="btn ghost" disabled={!text.trim() || saving} onClick={async () => {
      setSaving(true);
      try { await save({ data: { programId: program.id, activityId: activity.id, text } }); setText(""); await learning.refresh(); }
      catch { toast.error("Não foi possível salvar a anotação."); }
      finally { setSaving(false); }
    }}>{saving ? "Salvando…" : "Salvar anotação"}</Button>
  </details>;
}

const STEP_PATHS = ["/estagio/$slug/$n/caso", "/estagio/$slug/$n/demanda", "/estagio/$slug/$n/devolutiva", "/estagio/$slug/$n/gabarito"] as const;
const STEP_LABELS = ["Caso", "Demanda", "Devolutiva", "Gabarito"];
const STEP_NAMES = ["o caso", "a demanda", "a devolutiva", "o gabarito"];
/** "Voltar" to the previous step of the same activity (step 1 returns to Meus programas). */
export function BackStep({ step, slug, n }: { step: 1 | 2 | 3 | 4; slug: string; n: string }) {
  if (step === 1) return <Link to="/meus-programas" className="btn ghost step-back">← Voltar para meus programas</Link>;
  return <Link to={STEP_PATHS[step - 2]!} params={{ slug, n }} className="btn ghost step-back">← Voltar para {STEP_NAMES[step - 2]}</Link>;
}

/** Next-activity button that tells the learner whether it is already released. */
export function NextActivityButton({ program, idx }: { program: Program; idx: number }) {
  const { data } = useLearning();
  const next = program.activities[idx + 1];
  if (!next) return <Link to="/meus-programas" className="btn">Programa concluído · ir para meus programas</Link>;
  const open = canOpenActivity(program, data?.submissions ?? [], idx + 1);
  return open
    ? <Link to="/estagio/$slug/$n/caso" params={{ slug: program.slug, n: String(idx + 2) }} className="btn">Próxima atividade liberada →</Link>
    : <span className="btn next-locked" aria-disabled="true" title="Envie esta atividade para liberar a próxima">Próxima atividade não liberada</span>;
}
