import { createFileRoute, Link } from "@tanstack/react-router";
import { ActivityLayout, NotFoundBlock, useActivity } from "@/components/ActivityLayout";
import { Steps } from "@/components/AppShell";
import { downloadDoc } from "@/lib/store";
import { Rich } from "@/components/Rich";
import { FileList } from "@/components/FileList";

export const Route = createFileRoute("/estagio/$slug/$n/caso")({
  head: () => ({
    meta: [
      { title: "O caso — Empiria" },
      { name: "description", content: "Briefing do caso, contexto do cliente e documentos anexos." },
      { property: "og:title", content: "O caso — Empiria" },
      { property: "og:description", content: "Entenda o caso antes de receber a demanda." },
    ],
  }),
  component: CasePage,
});

function CasePage() {
  const { slug, n } = Route.useParams();
  const { program, activity, idx } = useActivity(slug, n);
  if (!program || !activity) return <NotFoundBlock />;
  return (
    <ActivityLayout program={program} activity={activity} idx={idx}>
      <Steps current={1} done={0} />
      <div className="eyebrow">O caso</div>
      <h1>O caso</h1>
      {activity.caseHtml ? <Rich html={activity.caseHtml} /> : activity.caseParagraphs.map((p, i) => <p key={i}>{p}</p>)}
      {activity.files?.length ? (
        <>
          <h4>Arquivos do caso</h4>
          <FileList files={activity.files} />
        </>
      ) : null}
      {activity.attachments.length > 0 && (
        <>
          <h4>Documentos anexos</h4>
          <div className="files">
            {activity.attachments.map((d) => (
              <div className="file" key={d.name}>
                <span className="ic">DOC</span>
                {d.name}
                <button className="dl" onClick={() => downloadDoc(d)}>
                  Baixar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {activity.caseNote && (
        <div className="callout">
          <div className="k">Caso fictício</div>
          <p>{activity.caseNote}</p>
        </div>
      )}
      <Link to="/estagio/$slug/$n/demanda" params={{ slug, n }} className="btn">
        Continuar
      </Link>
    </ActivityLayout>
  );
}
