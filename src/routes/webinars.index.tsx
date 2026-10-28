import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/AppShell";
import { listPublishedWebinars } from "@/lib/webinars.functions";
import { dateBR } from "@/lib/webinar-utils";

const opts = () => queryOptions({ queryKey: ["webinars"], queryFn: () => listPublishedWebinars() });

export const Route = createFileRoute("/webinars/")({
  head: () => ({
    meta: [
      { title: "Guia prático do advogado — Blog Empiria" },
      { name: "description", content: "Textos, webinars e outras trocas de suporte no dia a dia." },
      { property: "og:title", content: "Guia prático do advogado — Blog Empiria" },
      { property: "og:description", content: "Textos, webinars e outras trocas de suporte no dia a dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts()),
  component: WebinarList,
});

function WebinarList() {
  const { data } = useSuspenseQuery(opts());
  return (
    <SiteShell>
      <section className="wrap public-intro">
        <span className="pillbadge soft">Blog</span>
        <h1 className="display">Guia prático <em>do advogado.</em></h1>
        <p className="lead" style={{ margin: "0 auto" }}>Textos, webinars e outras trocas de suporte no dia a dia.</p>
      </section>
      <section className="wrap">
        {data.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: "40px 0" }}>Novos conteúdos em breve.</p>
        ) : (
          <div className="wb-grid">
            {data.map((w, i) => (
              <Link key={w.id} to="/webinars/$slug" params={{ slug: w.slug }} className={`wb-card${i === 0 ? " feat" : ""}`}>
                <div className="wb-cover">{w.cover_url ? <img src={w.cover_url} alt="" loading="lazy" /> : <span>▶</span>}</div>
                <div className="wb-body">
                  <div className="wb-meta">{dateBR(w.starts_at)}{w.speaker && ` · ${w.speaker}`}</div>
                  <h2>{w.title}</h2>
                  <p>{w.summary}</p>
                  <span className="wb-more">{w.video_url ? "Assistir" : "Ler conteúdo"} →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
