import { createFileRoute, Link } from "@tanstack/react-router";
import { ActivityLayout, NotFoundBlock, useActivity } from "@/components/ActivityLayout";
import { Steps } from "@/components/AppShell";
import { ReviewWindow } from "@/components/ReviewWindow";
import { actions, fmt, latestSubmission, reviewsLeft, subScore, useStore } from "@/lib/store";
import { toast } from "sonner";
import { Rich } from "@/components/Rich";

export const Route = createFileRoute("/estagio/$slug/$n/devolutiva")({
  head: () => ({
    meta: [
      { title: "Devolutiva — Empiria" },
      { name: "description", content: "Ficha de avaliação por critério, orientações e pontos de reflexão após a entrega." },
      { property: "og:title", content: "Devolutiva — Empiria" },
      { property: "og:description", content: "Sua ficha de avaliação por critério." },
    ],
  }),
  component: FeedbackPage,
});

const pipClass = (n: number) => (n >= 8 ? "ok" : n >= 6 ? "mid" : "low");

function FeedbackPage() {
  const { slug, n } = Route.useParams();
  const { program, activity, idx } = useActivity(slug, n);
  const sub = useStore((s) => (program && activity ? latestSubmission(s, program.id, activity.id) : undefined));
  if (!program || !activity) return <NotFoundBlock />;
  if (!sub)
    return (
      <ActivityLayout program={program} activity={activity} idx={idx}>
        <h1>Envie sua entrega primeiro</h1>
        <p className="muted">A devolutiva aparece depois que você envia a sua peça.</p>
        <Link to="/estagio/$slug/$n/demanda" params={{ slug, n }} className="btn">
          Ir para a demanda
        </Link>
      </ActivityLayout>
    );
  const score = subScore(sub);
  return (
    <ActivityLayout program={program} activity={activity} idx={idx}>
      <Steps current={3} done={2} />
      <div className="eyebrow">
        Devolutiva · atividade {idx + 1} · {activity.shortTitle.toLowerCase()}
      </div>
      <h1>Ficha de avaliação</h1>
      <p className="muted sm">Como o sênior marca a peça: trechos riscados, inserções e notas na margem.</p>
      <div style={{ marginBottom: 22 }}><ReviewWindow compact /></div>
      <div className="score-top">
        <div>
          <div className="lab">Nota da atividade</div>
          <span className="big">{fmt(score)}</span>
          <span className="of">/10</span>
        </div>
        <div className="side">
          {score == null
            ? `Entrega ${sub.fileName} recebida. A correção por critério é feita contra a rubrica do programa e aparece aqui assim que concluída.`
            : "Avaliada por critério contra a rubrica do programa."}
        </div>
      </div>
      <table className="rubric">
        <thead>
          <tr>
            <th>Critério</th>
            <th className="sc">Nota</th>
            <th>O que a correção observou</th>
          </tr>
        </thead>
        <tbody>
          {activity.rubric.map((r) => {
            const g = sub.grades?.find((x) => x.criterion === r.criterion);
            return (
              <tr key={r.criterion} className={g && g.score < 6 ? "flag" : ""}>
                <td className="crit">{r.criterion}</td>
                <td className="sc">{g ? <span className={`pip ${pipClass(g.score)}`}>{fmt(g.score).replace(",0", "")}</span> : <span className="muted">—</span>}</td>
                <td className="cmt">{g?.comment || <span className="muted">Aguardando correção.</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sub.teacherComment && (
        <div className="callout">
          <div className="k">Comentário do corretor</div>
          <p>{sub.teacherComment}</p>
        </div>
      )}
      <div className="callout">
        <div className="k">Orientação imediata</div>
        {activity.feedbackHtml ? <Rich html={activity.feedbackHtml} /> : <p>{activity.feedbackGuidance}</p>}
      </div>
      <h4>Pontos de reflexão</h4>
      <ul className="clean">
        {activity.reflectionPoints.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div className="ai-block">
        <div className="hd">
          <h3>Uso de inteligência artificial</h3>
          <span className="tagline">Declarado por você</span>
        </div>
        {sub.aiUse.split("; ").map((u) => (
          <div className="ai-row" key={u}>
            <span className="verdict">
              <span className={`vd ${/Gera/.test(u) ? "at" : "ok"}`}>{/Gera/.test(u) ? "Atenção" : "Adequado"}</span>
            </span>
            <span>
              <span className="what">{u}</span>
              <span className="why">
                {/Gera/.test(u)
                  ? "O problema não é a origem — é entregar raciocínio que você não construiu e não conseguiria sustentar se questionado."
                  : "Uso legítimo, desde que o resultado seja verificado na fonte primária e a autoria do raciocínio seja sua."}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="callout">
        <div className="k">Correção humana</div>
        <p>
          Discorda de algum critério? Um sênior relê a peça. Você tem direito a até duas revisões humanas por entrega
          {" "}— restam <b>{reviewsLeft(sub)}</b>.
        </p>
        <button
          className="btn ghost"
          disabled={reviewsLeft(sub) === 0}
          onClick={() => {
            actions.requestHumanReview(sub.id);
            toast.success("Pedido enviado. O sênior relê a peça e a nota é atualizada aqui.");
          }}
        >
          Pedir correção humana
        </button>
      </div>
      <div style={{ marginTop: 26 }}>
        <Link to="/estagio/$slug/$n/gabarito" params={{ slug, n }} className="btn">
          Liberar gabarito e comentário do professor
        </Link>
      </div>
    </ActivityLayout>
  );
}
