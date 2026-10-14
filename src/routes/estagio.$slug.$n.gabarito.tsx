import { createFileRoute, Link } from "@tanstack/react-router";
import { ActivityLayout, NotFoundBlock, useActivity } from "@/components/ActivityLayout";
import { Steps } from "@/components/AppShell";
import { downloadDoc, latestSubmission, useStore } from "@/lib/store";

export const Route = createFileRoute("/estagio/$slug/$n/gabarito")({
  head: () => ({
    meta: [
      { title: "Gabarito comentado — Empiria" },
      { name: "description", content: "Vídeo de debriefing do professor e peça de referência para download." },
      { property: "og:title", content: "Gabarito comentado — Empiria" },
      { property: "og:description", content: "Liberado somente após a sua entrega." },
    ],
  }),
  component: AnswerPage,
});

function AnswerPage() {
  const { slug, n } = Route.useParams();
  const { program, activity, idx } = useActivity(slug, n);
  const sub = useStore((s) => (program && activity ? latestSubmission(s, program.id, activity.id) : undefined));
  if (!program || !activity) return <NotFoundBlock />;
  if (!sub)
    return (
      <ActivityLayout program={program} activity={activity} idx={idx}>
        <h1>Gabarito bloqueado</h1>
        <div className="lockline">O gabarito é liberado somente depois que você enviar.</div>
        <div style={{ marginTop: 18 }}>
          <Link to="/estagio/$slug/$n/demanda" params={{ slug, n }} className="btn">
            Ir para a demanda
          </Link>
        </div>
      </ActivityLayout>
    );
  const next = program.activities[idx + 1];
  const rail = (
    <>
      {activity.answerVideoUrl ? (
        <video className="video" style={{ width: "100%" }} src={activity.answerVideoUrl} controls />
      ) : (
        <div className="video">
          <div className="play" />
          <div className="cap">{activity.answerVideoCaption}</div>
        </div>
      )}
      <h4>Competências esperadas</h4>
      <p className="sm muted">{activity.answerIntro}</p>
    </>
  );
  return (
    <ActivityLayout program={program} activity={activity} idx={idx} rail={rail}>
      <Steps current={4} done={3} />
      <div className="eyebrow">Atividade {idx + 1} · liberado após sua entrega</div>
      <h1>Gabarito comentado</h1>
      <div className="files">
        <div className="file">
          <span className="ic">DOC</span>
          {activity.referenceDoc.name}
          <button className="dl" onClick={() => downloadDoc(activity.referenceDoc)}>
            Baixar
          </button>
        </div>
      </div>
      <p className="sm muted">{activity.referenceDoc.description}</p>
      {activity.guideDocs.length > 0 && (
        <>
          <h4>Material de guia</h4>
          <div className="files">
            {activity.guideDocs.map((d) => (
              <div className="file" key={d.name}>
                <span className="ic">DOC</span>
                {d.name}
                <button className="dl" onClick={() => downloadDoc(d)}>
                  Abrir
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {next ? (
        <>
          <div className="callout">
            <div className="k">Sua próxima atividade</div>
            <p>
              {next.title} — {next.duration}.
            </p>
          </div>
          <Link to="/estagio/$slug/$n/caso" params={{ slug, n: String(idx + 2) }} className="btn">
            Ir para a atividade {idx + 2}
          </Link>
        </>
      ) : (
        <>
          <div className="callout">
            <div className="k">Programa concluído</div>
            <p>Você entregou todas as atividades. Emita seu certificado no portal do aluno.</p>
          </div>
          <Link to="/meus-programas" className="btn">
            Ir para meus programas
          </Link>
        </>
      )}
    </ActivityLayout>
  );
}
