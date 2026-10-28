import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, BriefcaseBusiness, FileCheck2, MessageSquareText, Volume2, VolumeX, Check, BookOpen } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { CampaignCapture } from "@/components/CampaignCapture";
import { Button } from "@/components/ui/button";
import { materialCampaign } from "@/lib/material-campaign";
import logo from "@/assets/empiria-logo-light.png.asset.json";
import workspace from "@/assets/auth-workspace.jpg";
import practicalCover from "@/assets/cover-pratico.jpg";
import theoryCover from "@/assets/cover-teorico.jpg";
import compatibleVideo from "@/assets/empiria-apresentacao.webm.asset.json";

export const Route = createFileRoute("/conheca")({
  head: () => ({ meta: [
    { title: "Conheça a Empiria — A plataforma, por dentro" },
    { name: "description", content: "Conheça o escritório simulado da Empiria. Registre seu interesse, assista à apresentação e descubra os cursos de arbitragem." },
    { property: "og:title", content: "Conheça a Empiria — A plataforma, por dentro" },
    { property: "og:description", content: "Da primeira demanda à devolutiva: um olhar por dentro da formação jurídica prática da Empiria." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CampaignPage,
});

function CampaignPage() {
  const [viewer, setViewer] = useState<{ name: string; interest: string } | null>(null);
  const [muted, setMuted] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("cq-visible"); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    node.querySelectorAll("[data-cq-reveal]").forEach((el) => { el.classList.add("cq-reveal"); observer.observe(el); });
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        node.style.setProperty("--cq-scroll", String(Math.min(window.scrollY * .12, 100)));
        const height = document.documentElement.scrollHeight - window.innerHeight;
        node.style.setProperty("--cq-page-progress", String(height > 0 ? window.scrollY / height : 0));
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [viewer]);
  const saved = (name: string, interest: string) => {
    setViewer({ name, interest });
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return <div className="cq-shell"><SiteShell hideNav minimalFooter><div className="cq-page" ref={root}>
    <div className="cq-scroll-progress" aria-hidden="true" />
    <main>
      {!viewer ? <section className="cq-entry">
        <img className="cq-backdrop" src={workspace} alt="" aria-hidden="true" />
        <div className="cq-entry-wash" aria-hidden="true" />
        <div className="cq-wrap cq-entry-content">
          <div className="cq-brand-row"><img src={logo.url} alt="Empiria" /></div>
          <div className="cq-entry-grid">
            <div className="cq-entry-copy">
              <div className="cq-eyebrow"><span /> O SEU PRÓXIMO PASSO, POR DENTRO</div>
              <h1><span>O ofício antes</span><span>da <em>oportunidade.</em></span></h1>
              <p>Um escritório simulado. Demandas que chegam à sua mesa. Entregas que transformam conhecimento em prática.</p>
            </div>
            <CampaignCapture onSaved={saved} />
          </div>
        </div>
      </section> : <section className="cq-unlocked cq-wrap">
        <div className="cq-brand-row"><img src={logo.url} alt="Empiria" /><span><Check size={14} /> INTERESSE REGISTRADO</span></div>
        <div className="cq-video-intro"><div className="cq-eyebrow">BOAS-VINDAS, {viewer.name.toLocaleUpperCase("pt-BR")}.</div><h1>A plataforma,<br /><em>por dentro.</em></h1><p>Da demanda à devolutiva. Conheça o seu lugar no escritório simulado.</p></div>
        <div className="cq-video-stage">
          {materialCampaign.videoUrl ? <video ref={video} controls autoPlay muted={muted} playsInline preload="auto" aria-label="Vídeo de apresentação da Empiria" onVolumeChange={() => setMuted(video.current?.muted ?? true)} onTimeUpdate={() => { const player = video.current; if (player && Number.isFinite(player.duration) && player.duration > 0) setProgress(player.currentTime / player.duration); }} onEnded={() => setCompleted(true)}><source src={materialCampaign.videoUrl} type="video/mp4" /><source src={compatibleVideo.url} type="video/webm" /></video> : <p>O vídeo está em preparação.</p>}
          <div className="cq-video-line"><span ref={(el) => { el?.style.setProperty("--video-progress", String(progress)); }} /></div>
          <Button variant="ghost" size="icon" className="cq-sound" title={muted ? "Ativar som" : "Silenciar"} aria-label={muted ? "Ativar som" : "Silenciar"} onClick={() => { if (video.current) video.current.muted = !muted; setMuted(!muted); }}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</Button>
        </div>
        <div className="cq-video-bottom"><span>{completed ? <><Check size={16} /> Apresentação concluída</> : "Um olhar para a sua próxima experiência."}</span><Button variant="ghost" onClick={() => document.getElementById("cq-cursos")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Conhecer os cursos <ArrowDown size={16} /></Button></div>
      </section>}
      {viewer && <section className="cq-method" aria-label="O método Empiria">
        <div className="cq-wrap">
          <div className="cq-section-heading" data-cq-reveal><span className="cq-eyebrow">DA TEORIA À SUA MESA</span><h2>Não é só aprender.<br />É <em>ter o que entregar.</em></h2><p>A experiência de um escritório, com espaço para construir sua prática e aprender com a devolutiva.</p></div>
          <div className="cq-method-grid">
            {[{ n: "01", Icon: BriefcaseBusiness, title: "A demanda chega.", text: "Você recebe o contexto do caso, os documentos e uma tarefa concreta." }, { n: "02", Icon: FileCheck2, title: "A entrega é sua.", text: "Analise, decida e redija. Transforme o que você sabe em trabalho jurídico." }, { n: "03", Icon: MessageSquareText, title: "A devolutiva faz avançar.", text: "Critérios de avaliação e referências para entender sua entrega e desenvolver sua prática." }].map(({ n, Icon, title, text }) => <article className="cq-method-item" data-cq-reveal key={n}><div className="cq-method-top"><span>{n}</span><Icon size={28} /></div><h3>{title}</h3><p>{text}</p><div className="cq-method-rule" /></article>)}
          </div>
        </div>
      </section>}
      {viewer && <section className="cq-courses cq-wrap" id="cq-cursos">
        <div className="cq-section-heading" data-cq-reveal><span className="cq-eyebrow">DOIS FORMATOS. UM NOVO COMEÇO.</span><h2>Encontre o seu<br /><em>ponto de partida.</em></h2><p>Construa suas entregas no Simulado ou organize seus fundamentos no Teórico.</p></div>
        <div className="cq-course-grid">
          {[{ interest: "Curso Simulado", slug: "arbitragem-nivel-1", title: "Arbitragem — Nível 1", type: "CURSO SIMULADO", cover: practicalCover, Icon: BriefcaseBusiness, description: "Seis atividades encadeadas em um escritório fictício. Do caso à entrega, com avaliação por critérios e devolutiva.", details: "6 atividades · Prática jurídica", price: "890", full: "1.190" }, { interest: "Curso Teórico", slug: "introducao-a-arbitragem", title: "Introdução à Arbitragem", type: "CURSO TEÓRICO", cover: theoryCover, Icon: BookOpen, description: "Um percurso pela arbitragem, fase por fase. Aulas e modelos comentados para levar o conhecimento à sua prática.", details: "8 aulas · 32 modelos", price: "590", full: "890" }].map((course) => <article className="cq-course" key={course.slug} data-cq-reveal>
            <div className="cq-course-image"><img src={course.cover} alt="" /><span>{course.type}</span>{(viewer.interest === course.interest || viewer.interest === "Os dois") && <b><Check size={12} /> SEU INTERESSE</b>}</div>
            <div className="cq-course-body"><course.Icon size={23} /><h3>{course.title}</h3><p>{course.description}</p><span className="cq-course-details">{course.details}</span><div className="cq-course-price"><span><small>R$</small> {course.price}</span><del>R$ {course.full}</del><b>PRÉ-VENDA</b></div><Button asChild className="cq-course-cta"><Link to="/programa/$slug" params={{ slug: course.slug }}>Conhecer o curso <ArrowUpRight size={18} /></Link></Button></div>
          </article>)}
        </div>
      </section>}
      {viewer && <section className="cq-last cq-wrap" data-cq-reveal><span className="cq-eyebrow">EMPIRIA</span><h2>O conhecimento ganha vida<br />quando <em>vira experiência.</em></h2></section>}
    </main>
  </div></SiteShell></div>;
}
