import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/AppShell";
import { Rich } from "@/components/Rich";
import { getPublishedWebinar, trackWebinarVisit } from "@/lib/webinars.functions";
import { dateBR, embedUrl } from "@/lib/webinar-utils";

const opts = (slug: string) => queryOptions({ queryKey: ["webinar", slug], queryFn: () => getPublishedWebinar({ data: { slug } }) });

export const Route = createFileRoute("/webinars/$slug")({
  loader: async ({ context, params }) => {
    const w = await context.queryClient.ensureQueryData(opts(params.slug));
    if (!w) throw notFound();
    return w;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — Blog Empiria` : "Blog — Empiria";
    const desc = loaderData?.summary || "Textos, webinars e outras trocas de suporte no dia a dia.";
    const img = loaderData?.cover_url?.startsWith("https://") ? loaderData.cover_url : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <SiteShell>
      <section className="wrap public-intro">
        <h1 className="display">Conteúdo não encontrado</h1>
        <Link to="/webinars" className="btn">Voltar ao Blog</Link>
      </section>
    </SiteShell>
  ),
  component: WebinarPage,
});

function visitorId() {
  const k = "empiria-visitor";
  let v = localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
  return v;
}

function WebinarPage() {
  const { slug } = Route.useParams();
  const { data: w } = useSuspenseQuery(opts(slug));
  const track = useServerFn(trackWebinarVisit);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!w) return;
    const key = `wb-seen-${w.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const sp = new URLSearchParams(window.location.search);
    const g = (n: string) => (sp.get(n) ?? "").replace(/[^\w\-. ]/g, "").slice(0, 80);
    track({ data: { webinarId: w.id, visitorId: visitorId(), ref: g("ref"), utmSource: g("utm_source"), utmMedium: g("utm_medium"), utmCampaign: g("utm_campaign") } }).catch(() => {});
  }, [w, track]);
  if (!w) return null;
  const embed = w.video_url ? embedUrl(w.video_url) : null;
  async function share() {
    if (!w) return;
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: w.title, url }); return; } catch { /* cancelado */ } }
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <SiteShell>
      <article className="wrap wb-article">
        <Link to="/webinars" className="wb-back">← Blog</Link>
        <div className="wb-meta">{dateBR(w.starts_at)}{w.speaker && ` · ${w.speaker}`}</div>
        <h1 className="display" style={{ textAlign: "left" }}>{w.title}</h1>
        {w.summary && <p className="lead" style={{ textAlign: "left", margin: "0 0 24px" }}>{w.summary}</p>}
        {embed ? (
          <div className="wb-video"><iframe src={embed} title={w.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" /></div>
        ) : w.video_url ? (
          <a className="btn" href={w.video_url} target="_blank" rel="noopener noreferrer">Assistir ao webinar</a>
        ) : w.cover_url ? <img className="wb-hero" src={w.cover_url} alt="" /> : null}
        <div className="wb-share"><button type="button" className="btn ghost" onClick={share}>{copied ? "Link copiado ✓" : "Compartilhar"}</button></div>
        {w.body_html && <Rich html={w.body_html} className="rich" />}
      </article>
    </SiteShell>
  );
}
