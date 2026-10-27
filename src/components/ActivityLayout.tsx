import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { fmt, subScore, type Activity, type Program } from "@/lib/store";
import { useLearning } from "@/lib/learning";
import { canOpenActivity, currentSubmission, learningProgress } from "@/lib/learning-rules";

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
        const score = subScore(sub);
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
                {sub ? (score != null ? `Concluída · nota ${fmt(score)}` : "Entregue · aguardando correção") : i === current ? "Em andamento" : unlocked ? "Disponível agora" : a.duration}
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
}: {
  program: Program;
  activity: Activity;
  idx: number;
  rail?: ReactNode;
  children: ReactNode;
}) {
  const { data } = useLearning();
  const done = learningProgress(program, data?.submissions ?? []).done;
  const pct = program.activities.length ? (done / program.activities.length) * 100 : 0;
  return (
    <AppShell>
      <div className="proghead">
        <div>
          <div className="eyebrow">
            {program.kind.split(" ")[0]} · {program.title}
          </div>
          <h2>
            Atividade {idx + 1} — {activity.title}
          </h2>
        </div>
        <div className="progress">
          <div className="lbl">
            {done} de {program.activities.length} atividades
          </div>
          <div className="track">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="body">
        <aside className="rail">{rail ?? <ActivityRail program={program} current={idx} />}</aside>
        <main className="pane">{children}</main>
      </div>
    </AppShell>
  );
}
