import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { completedCount, fmt, latestSubmission, subScore, useStore, type Activity, type Program } from "@/lib/store";

export function useActivity(slug: string, n: string) {
  const program = useStore((s) => s.programs.find((p) => p.slug === slug));
  const idx = Math.max(0, Number(n) - 1);
  const activity = program?.activities[idx];
  return { program, activity, idx };
}

export function NotFoundBlock() {
  return (
    <AppShell>
      <div className="pane">
        <h1>Atividade não encontrada</h1>
        <Link to="/" className="btn">
          Voltar ao catálogo
        </Link>
      </div>
    </AppShell>
  );
}

export function ActivityRail({ program, current }: { program: Program; current: number }) {
  const state = useStore((s) => s);
  return (
    <ul className="acts">
      {program.activities.map((a, i) => {
        const sub = latestSubmission(state, program.id, a.id);
        const unlocked = i === 0 || !!latestSubmission(state, program.id, program.activities[i - 1].id);
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
  const state = useStore((s) => s);
  const done = completedCount(state, program);
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
