import { createFileRoute, Link } from "@tanstack/react-router";
import { ActivityLayout, NotFoundBlock, useActivity } from "@/components/ActivityLayout";
import { Steps } from "@/components/AppShell";
import { fmt, reviewQuota, subScore, type Submission } from "@/lib/store";
import { useLearning } from "@/lib/learning";
import { attemptStatus, MIN_PASS_SCORE, activityReviewPending, activityStanding, aiScore, finalScore } from "@/lib/learning-rules";
import { isTerminal, issueMessage, type AiStatus } from "@/lib/ai-grading-rules";
import { requestLearningReview, learningFileUrl } from "@/lib/learning.functions";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Rich } from "@/components/Rich";

export const Route = createFileRoute("/estagio/$slug/$n/devolutiva")({
  head: () => ({
    meta: [
      { title: "Devolutiva — Empiria" },
      { name: "description", content: "Ficha de avaliação por critério, orientações e pontos de reflexão após a entrega." },
      { property: "og:title", content: "Devolutiva — Empiria" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Sua ficha de avaliação por critério." },
    ],
  }),
  component: FeedbackPage,
});

const pipClass = (n: number) => (n >= 8 ? "ok" : n >= 6 ? "mid" : "low");
const pip = (n: number) => <span className={`pip ${pipClass(n)}`}>{fmt(n).replace(",0", "")}</span>;
const POLL = [4000, 6000, 9000, 14000, 20000, 30000];
const MAX_POLLS = 40;
const working = (s?: AiStatus) => s === "pending" || s === "extracting" || s === "evaluating";

function FeedbackPage() {
  const { slug, n } = Route.useParams();
  const { program, activity, idx } = useActivity(slug, n);
  // useLearning also starts (and later resumes) grading of a queued delivery while any course page is open.
  const learning = useLearning();
  const request = useServerFn(requestLearningReview);
  const fileUrl = useServerFn(learningFileUrl);
  const [requesting, setRequesting] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const polls = useRef(0);
  const submissions = learning.data?.submissions ?? [];
  const mine = program && activity ? submissions.filter((s) => s.programId === program.id && s.activityId === activity.id).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)) : [];
  const sub = mine.find((s) => s.id === picked) ?? mine.at(-1);
  const voided = program && activity ? (learning.data?.voided ?? []).filter((s) => s.programId === program.id && s.activityId === activity.id).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).at(-1) : undefined;
  const voidedNotice = voided && (!mine.at(-1) || voided.submittedAt > mine.at(-1)!.submittedAt) ? voided : undefined;
  const status = sub?.ai?.status;
  const quota = reviewQuota({ submissions }, program?.id ?? "", learning.user?.id ?? "", activity?.id ?? "");
  const { refresh } = learning;

  // Light polling with backoff only while the evaluation is still moving.
  useEffect(() => {
    if (!working(status)) { polls.current = 0; return; }
    if (polls.current >= MAX_POLLS) return;
    const t = window.setTimeout(() => { polls.current += 1; void refresh(); }, POLL[Math.min(polls.current, POLL.length - 1)]);
    return () => window.clearTimeout(t);
  }, [status, sub?.ai, refresh]);

  if (!program || !activity) return <NotFoundBlock />;
  const voidBox = voidedNotice && (
    <div className="callout" role="alert">
      <div className="k">Não conseguimos ler o seu arquivo</div>
      <p>{issueMessage(voidedNotice.ai?.issueCode ?? voidedNotice.voidReason)}</p>
      <p className="muted sm">Arquivo: {voidedNotice.fileName}. Você não perdeu nenhuma tentativa.</p>
      <Link to="/estagio/$slug/$n/demanda" params={{ slug, n }} className="btn">Enviar novamente</Link>
    </div>
  );
  if (!sub)
    return (
      <ActivityLayout program={program} activity={activity} idx={idx}>
        {voidBox}
        <h1>Envie sua entrega primeiro</h1>
        <p className="muted">A devolutiva aparece depois que você envia a sua peça.</p>
        <Link to="/estagio/$slug/$n/demanda" params={{ slug, n }} className="btn">
          Ir para a demanda
        </Link>
      </ActivityLayout>
    );
  const ai = sub.ai;
  const done = ai?.status === "completed" && ai.overallScore !== undefined && ai.criteria;
  const humanScore = subScore(sub);
  const shown = finalScore(sub);
  const standing = activityStanding(mine, program.id, activity.id);
  const attempts = attemptStatus(mine, program.id, activity.id);
  const reviewPending = activityReviewPending(submissions, program.id, activity.id);
  const next = program.activities[idx + 1];
  const actions = (
    <div className="feedback-actions">
      {!attempts.reached && <Link to="/estagio/$slug/$n/demanda" params={{ slug, n }} className="btn ghost">Refazer entrega ({attempts.max - attempts.used} restante)</Link>}
      {quota.status === "none" && quota.canRequest && <a href="#correcao-humana" className="btn ghost">Pedir revisão humana</a>}
      {reviewPending ? <span className="lockline">Gabarito liberado após a revisão</span> : <Link to="/estagio/$slug/$n/gabarito" params={{ slug, n }} className="btn ghost">Ver gabarito</Link>}
      {next && <Link to="/estagio/$slug/$n/caso" params={{ slug, n: String(idx + 2) }} className="btn">Próxima atividade</Link>}
    </div>
  );
  return (
    <ActivityLayout program={program} activity={activity} idx={idx}>
      <Steps current={3} done={2} />
      <div className="eyebrow">
        Devolutiva · atividade {idx + 1} · {activity.shortTitle.toLowerCase()}
      </div>
      {voidBox}
      <h1>Ficha de avaliação</h1>
      {mine.length > 1 && (
        <div className="ai-attempts" role="tablist" aria-label="Entregas desta atividade">
          {mine.map((s, i) => (
            <button key={s.id} role="tab" aria-selected={s.id === sub.id} className={s.id === sub.id ? "on" : ""} onClick={() => { setPicked(s.id); setOpen(null); }}>
              Entrega {i + 1} <span>{new Date(s.submittedAt).toLocaleDateString("pt-BR")}</span>
            </button>
          ))}
        </div>
      )}
      <Button className="btn ghost" onClick={async () => {
        try { window.location.assign(await fileUrl({ data: { id: sub.id } })); }
        catch { toast.error("Não foi possível abrir sua entrega."); }
      }}>Baixar esta entrega</Button>
      <div className="score-top">
        <div>
          <div className="lab">Nota da atividade</div>
          {shown !== null ? (
            <span className="ai-settle" key={`${ai?.id}-${humanScore ?? ""}`}>
              <span className="big">{fmt(shown)}</span>
              <span className="of">/10</span>
            </span>
          ) : (
            <span className="wait">{working(ai?.status) ? "Em correção" : ai && isTerminal(ai.status) ? "Em análise pela equipe" : "Aguardando correção"}</span>
          )}
        </div>
        <div className="side">
          {sub.grades?.length
            ? aiScore(sub) !== null ? `Nota da revisão humana, que prevalece sobre a correção automatizada (${fmt(aiScore(sub)!)}).` : "Nota da revisão humana."
            : done
            ? "Correção automatizada com IA, critério a critério, pela rubrica docente da atividade."
            : working(ai?.status)
              ? `Entrega ${sub.fileName} recebida. A correção pela rubrica está em andamento.`
              : ai && isTerminal(ai.status)
                ? issueMessage(ai.issueCode)
                : `Entrega ${sub.fileName} recebida. A correção por critério aparece aqui assim que concluída.`}
        </div>
      </div>

      {standing.passed !== null && (
        <p className="muted sm" role="status">
          Nota mínima para o certificado: {fmt(MIN_PASS_SCORE)}.{" "}
          {standing.passed ? "Atingida nesta atividade." : "Ainda não atingida nesta atividade; isso aparece no certificado, mas não bloqueia as próximas atividades."}
        </p>
      )}
      {actions}
      {working(ai?.status) && <AiReading status={ai!.status} />}

      <div className="ai-feedback">
      <table className="rubric">
        <thead>
          <tr>
            <th>Critério</th>
            <th className="sc">Nota</th>
            <th>O que a correção observou</th>
          </tr>
        </thead>
        <tbody>
          {done
            ? ai.criteria!.map((c) => {
                const expanded = open === c.criterion;
                const more = c.strengths.length > 0 || c.improvements.length > 0;
                return (
                  <tr key={c.criterion} className={c.score < 6 ? "flag" : ""}>
                    <td className="crit">{c.criterion}</td>
                    <td className="sc">{pip(c.score)}</td>
                    <td className="cmt">
                      {c.comment}
                      {more && (
                        <>
                          <button className="ai-more" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : c.criterion)}>
                            {expanded ? "Recolher detalhes" : "Pontos fortes e a desenvolver"}
                          </button>
                          {expanded && (
                            <div className="ai-detail">
                              {c.strengths.length > 0 && <div><b>Pontos fortes</b><ul>{c.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>}
                              {c.improvements.length > 0 && <div><b>A desenvolver</b><ul>{c.improvements.map((s) => <li key={s}>{s}</li>)}</ul></div>}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            : activity.rubric.map((r) => (
                <tr key={r.criterion}>
                  <td className="crit">{r.criterion}</td>
                  <td className="sc"><span className="muted">—</span></td>
                  <td className="cmt"><span className="muted">{working(ai?.status) ? "Em correção." : "Aguardando correção."}</span></td>
                </tr>
              ))}
        </tbody>
      </table>
      </div>
      {done && ai.overallFeedback && (
        <div className="callout">
          <div className="k">Síntese da correção</div>
          <p>{ai.overallFeedback}</p>
        </div>
      )}
      {done && (
        <p className="ai-provenance">
          Avaliação gerada por correção automatizada com IA em {new Date(ai.completedAt ?? sub.submittedAt).toLocaleString("pt-BR")}. Ela não substitui a revisão humana, que pode ser solicitada abaixo.
        </p>
      )}
      {sub.grades && <HumanReview sub={sub} score={humanScore} />}
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
        {done && ai.ethicsNote && <p className="ai-ethics"><b>Orientação da correção:</b> {ai.ethicsNote} <span>Esta orientação não altera a nota.</span></p>}
      </div>
      <div className="callout" id="correcao-humana">
        <div className="k">Correção humana</div>
        <p>
          Discorda de algum critério? Um sênior relê a peça. Você pode pedir correção humana em até {quota.max} atividades
          por curso. Enquanto a revisão estiver em andamento, o gabarito fica trancado.
        </p>
        <p className="review-quota">
          <span>Saldo no curso: <b>{quota.courseLeft} de {quota.max}</b> {quota.courseLeft === 1 ? "disponível" : "disponíveis"}</span>
          <span>
            Nesta atividade:{" "}
            <b>
              {quota.status === "pending" ? "revisão solicitada · em andamento" : quota.status === "done" ? "revisão concluída" : "nenhuma revisão solicitada"}
            </b>
          </span>
        </p>
        {quota.status === "none" && (
          <Button
            className="btn ghost"
            disabled={!quota.canRequest || requesting}
            onClick={async () => {
              setRequesting(true);
              try { await request({ data: { id: sub.id } }); await learning.refresh(); toast.success("Pedido enviado."); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível pedir revisão."); }
              finally { setRequesting(false); }
            }}
          >
            {quota.courseLeft === 0 ? "Saldo de revisões esgotado" : "Pedir correção humana"}
          </Button>
        )}
      </div>
      <div style={{ marginTop: 26 }}>
        {activityReviewPending(submissions, program.id, activity.id) ? (
          <div className="lockline">Correção humana em andamento. O gabarito é liberado quando o sênior concluir.</div>
        ) : (
          <Link to="/estagio/$slug/$n/gabarito" params={{ slug, n }} className="btn">
            Liberar gabarito e comentário do professor
          </Link>
        )}
      </div>
    </ActivityLayout>
  );
}

const STAGES: { key: AiStatus; label: string }[] = [
  { key: "pending", label: "Entrega recebida" },
  { key: "extracting", label: "Leitura do documento" },
  { key: "evaluating", label: "Avaliação pela rubrica" },
];
/** Real queue stage (from the database), shown as a page being read line by line. */
function AiReading({ status }: { status: AiStatus }) {
  const at = STAGES.findIndex((s) => s.key === status);
  return (
    <div className="ai-reading" role="status" aria-live="polite">
      <div className="ai-sheet" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.55}s` }} />)}
      </div>
      <div>
        <b>{status === "pending" ? "Na fila de correção" : status === "extracting" ? "Lendo o seu documento" : "Aplicando a rubrica docente"}</b>
        <ol className="ai-stages">
          {STAGES.map((s, i) => (
            <li key={s.key} className={i < at ? "done" : i === at ? "now" : ""}>{s.label}</li>
          ))}
        </ol>
        <p className="muted sm">Pode sair desta página: a devolutiva fica salva e aparece aqui quando concluída.</p>
      </div>
    </div>
  );
}

function HumanReview({ sub, score }: { sub: Submission; score: number | null }) {
  return (
    <section className="ai-human ai-feedback">
      <div className="ai-human-hd">
        <h3>Revisão humana</h3>
        {score != null && <span>Nota da revisão {pip(score)}</span>}
      </div>
      <p className="muted sm">Registrada pela equipe e exibida separadamente da correção automatizada.</p>
      <table className="rubric">
        <tbody>
          {sub.grades!.map((g) => (
            <tr key={g.criterion}>
              <td className="crit">{g.criterion}</td>
              <td className="sc">{pip(g.score)}</td>
              <td className="cmt">{g.comment || <span className="muted">Sem comentário.</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sub.teacherComment && <p className="ai-human-cmt">{sub.teacherComment}</p>}
    </section>
  );
}
