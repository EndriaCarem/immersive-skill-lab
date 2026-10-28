import { Fragment } from "react";
import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, Volume2, VolumeX } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { CampaignCapture } from "@/components/CampaignCapture";
import { Button } from "@/components/ui/button";
import { materialCampaign } from "@/lib/material-campaign";
import { campaignViewerKey, parseCampaignViewer } from "@/lib/campaign-viewer";
import logo from "@/assets/empiria-logo-light.png.asset.json";
import workspace from "@/assets/auth-workspace.jpg";
import compatibleVideo from "@/assets/empiria-apresentacao-atualizada.webm.asset.json";

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

function AnimatedWords({ text, start }: { text: string; start: number }) {
  let n = start;
  return <>{text.split(" ").map((word, wi) => <Fragment key={wi}>{wi > 0 ? " " : null}<span className="cq-wordbox">{[...word].map((ch, ci) => <span key={ci} className="cq-letter" style={{ "--i": n++ } as React.CSSProperties}>{ch}</span>)}</span></Fragment>)}</>;
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => { const p = Math.min((t - t0) / 1400, 1); setValue(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }, { threshold: .4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{value}</span>;
}

function CampaignPage() {
  const [viewer, setViewer] = useState<{ name: string; interest: string } | null>(null);
  const [muted, setMuted] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    try {
      const remembered = parseCampaignViewer(window.localStorage.getItem(campaignViewerKey));
      if (remembered) setViewer(remembered);
    } catch {
      // Storage can be unavailable in private or restricted browsers.
    }
  }, []);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      entry.target.classList.toggle("cq-visible", entry.isIntersecting);
    }), { threshold: .15, rootMargin: "0px 0px -12% 0px" });
    node.querySelectorAll("[data-cq-reveal]").forEach((el) => { el.classList.add("cq-reveal"); observer.observe(el); });
    const onMove = (ev: PointerEvent) => { const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-cq-glow]"); if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty("--mx", `${ev.clientX - r.left}px`); el.style.setProperty("--my", `${ev.clientY - r.top}px`); };
    node.addEventListener("pointermove", onMove);
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        node.style.setProperty("--cq-scroll", String(Math.min(window.scrollY * .12, 100)));
        const height = document.documentElement.scrollHeight - window.innerHeight;
        node.style.setProperty("--cq-page-progress", String(height > 0 ? window.scrollY / height : 0));
        node.querySelectorAll<HTMLElement>(".cq-v2-sec").forEach((section) => {
          const top = section.getBoundingClientRect().top;
          const remaining = Math.max(0, Math.min(1, (top - window.innerHeight * .12) / (window.innerHeight * .78)));
          section.style.setProperty("--cq-motion", String(remaining));
        });
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    return () => { observer.disconnect(); node.removeEventListener("pointermove", onMove); window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [viewer]);
  const saved = (name: string, interest: string) => {
    setViewer({ name, interest });
    try {
      window.localStorage.setItem(campaignViewerKey, JSON.stringify({ name, interest }));
    } catch {
      // Successful Cloud capture still unlocks the video without local storage.
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return <div className="cq-shell"><SiteShell hideNav minimalFooter><div className="cq-page" ref={root}>
    <div className="cq-scroll-progress" aria-hidden="true" />
    <main>
      {!viewer ? <section className="cq-entry">
        <img className="cq-backdrop" src={workspace} alt="" aria-hidden="true" />
        <div className="cq-entry-wash" aria-hidden="true" />
        <div className="cq-orbs" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="cq-wrap cq-entry-content">
          <div className="cq-brand-row"><img src={logo.url} alt="Empiria" /></div>
          <div className="cq-entry-grid">
            <div className="cq-entry-copy">
              <h1 className="cq-letters" aria-label="O ofício antes da oportunidade."><span aria-hidden="true"><AnimatedWords text="O ofício antes" start={0} /></span><span aria-hidden="true"><AnimatedWords text="da" start={13} /> <em><AnimatedWords text="oportunidade." start={16} /></em></span></h1>
              <p className="cq-words" aria-label="Um escritório simulado. Demandas que chegam à sua mesa. Entregas que transformam conhecimento em prática."><span aria-hidden="true">{"Um escritório simulado. Demandas que chegam à sua mesa. Entregas que transformam conhecimento em prática.".split(" ").map((w, i) => <span key={i} className="cq-word" style={{ "--i": i } as React.CSSProperties}>{w}{" "}</span>)}</span></p>
            </div>
            <CampaignCapture onSaved={saved} />
          </div>
        </div>
      </section> : <section className="cq-unlocked cq-v2-hero">
        <img className="cq-backdrop" src={workspace} alt="" aria-hidden="true" />
        <div className="cq-entry-wash" aria-hidden="true" />
        <div className="cq-orbs" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="cq-arcs" aria-hidden="true"><i /><i /></div>
        <div className="cq-wrap">
          <div className="cq-brand-row"><img src={logo.url} alt="Empiria" /></div>
          <div className="cq-video-intro">
            <div className="cq-eyebrow cq-v2-eyebrow"><i />OBRIGADA, {viewer.name.split(" ")[0]?.toLocaleUpperCase("pt-BR")}. O VÍDEO ESTÁ LIBERADO.</div>
            <h1 className="cq-letters" aria-label="A plataforma, por dentro."><span aria-hidden="true"><AnimatedWords text="A plataforma," start={0} /> <em><AnimatedWords text="por dentro." start={12} /></em></span></h1>
            <p>Da demanda à devolutiva, do documento de referência à aula do Teórico: um minuto e meio dentro da plataforma.</p>
          </div>
          <div className="cq-video-stage cq-v2-video">
            {materialCampaign.videoUrl ? <video ref={video} width={848} height={480} style={{ aspectRatio: "848 / 480" }} autoPlay loop muted={muted} playsInline preload="auto" aria-label="Vídeo de apresentação da Empiria" onVolumeChange={() => setMuted(video.current?.muted ?? true)}><source src={materialCampaign.videoUrl} type="video/mp4" /><source src={compatibleVideo.url} type="video/webm" /></video> : <p>O vídeo está em preparação.</p>}
            <Button variant="ghost" size="icon" className="cq-sound" title={muted ? "Ativar som" : "Silenciar"} aria-label={muted ? "Ativar som" : "Silenciar"} onClick={() => { if (video.current) video.current.muted = !muted; setMuted(!muted); }}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</Button>
          </div>
          <div className="cq-v2-scroll"><Button variant="ghost" onClick={() => document.getElementById("cq-sobre")?.scrollIntoView({ behavior: "smooth" })}>Continuar <ArrowDown size={16} /></Button></div>
        </div>
      </section>}
      {viewer && <section className="cq-v2-sec cq-v2-about" id="cq-sobre">
        <div className="cq-arcs" aria-hidden="true"><i /><i /></div>
        <div className="cq-wrap">
          <div className="cq-v2-head" data-cq-reveal><span className="cq-eyebrow cq-v2-eyebrow"><i />O QUE É A EMPIRIA</span><h2>Aprenda o ofício <em>antes da oportunidade.</em></h2><p>A Empiria é uma plataforma de formação jurídica prática: um escritório simulado em que a demanda chega como chegaria na banca, você faz a entrega e ela volta corrigida, critério por critério, no padrão das grandes bancas.</p></div>
          <div className="cq-v2-steps">
            {[{ title: "A demanda chega", text: "Um vídeo e um e-mail do sócio, com a pasta do caso. Sem roteiro de resolução." }, { title: "Você entrega; o sênior corrige", text: "Nota em cada critério e devolutiva escrita, no padrão de um sócio. Abaixo de 5,0, você refaz uma vez." }, { title: "Só então, o documento de referência", text: "O modelo do professor e o vídeo dele comentando a demanda: o essencial, a organização, a estratégia." }].map((s, i) => <article className="cq-v2-step" data-cq-reveal data-cq-glow key={s.title} style={{ "--d": i } as React.CSSProperties}><span className="cq-v2-num">{i + 1}</span><div><h3>{s.title}</h3><p>{s.text}</p></div></article>)}
          </div>
        </div>
      </section>}
      {viewer && <section className="cq-v2-sec cq-v2-courses" id="cq-cursos">
        <div className="cq-orbs" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="cq-arcs" aria-hidden="true"><i /><i /></div>
        <div className="cq-wrap">
          <div className="cq-v2-head" data-cq-reveal><span className="cq-eyebrow cq-v2-eyebrow"><i />OS DOIS CURSOS</span><h2>Cursos em <em>dois formatos.</em></h2><p>Os dois sobre o trabalho que chega à mesa, não sobre a doutrina. No Simulado você produz e é corrigido; no Teórico você assiste e sai com o material para usar.</p></div>
          <div className="cq-v2-grid">
            {[{ interest: "Curso Simulado", slug: "arbitragem-nivel-1", title: ["Curso Simulado", "de Arbitragem"], description: "Seis demandas encadeadas sobre o mesmo caso. Você é o júnior de uma banca fictícia e conduz um procedimento do início ao fim, com nota em cada entrega. Certificado com nota.", price: 890, full: "1.190", light: true }, { interest: "Curso Teórico", slug: "introducao-a-arbitragem", title: ["Curso Teórico", "de Arbitragem"], description: "Oito aulas, uma por fase do procedimento, com quatro tópicos essenciais por aula e um material por tópico: modelos comentados, checklists, mapas mentais. 32 materiais ao todo.", price: 590, full: "890", light: false }].map((c, i) => <article className={`cq-v2-course ${c.light ? "is-light" : "is-plum"}`} data-cq-reveal data-cq-glow key={c.slug} style={{ "--d": i } as React.CSSProperties}>
              <header>{(viewer.interest === c.interest || viewer.interest === "Os dois") && <b className="cq-v2-badge">SEU INTERESSE</b>}<h3>{c.title[0]}<br />{c.title[1]}</h3><img className="cq-v2-tree" src="/favicon.png" alt="" /></header>
              <div className="cq-v2-cbody"><p>{c.description}</p><div className="cq-v2-price"><strong>R$ <CountUp to={c.price} /></strong><del>R$ {c.full}</del></div><small>Preço de lançamento · até 3x sem juros · acesso por seis meses</small><Button asChild className="cq-v2-cta"><Link to="/programa/$slug" params={{ slug: c.slug }}>Garantir o preço de lançamento</Link></Button></div>
            </article>)}
          </div>
        </div>
      </section>}
      {viewer && <section className="cq-v2-sec cq-v2-ai">
        <div className="cq-arcs" aria-hidden="true"><i /><i /></div>
        <div className="cq-wrap cq-v2-ai-grid">
          <div className="cq-v2-head" data-cq-reveal><span className="cq-eyebrow cq-v2-eyebrow"><i />A INTELIGÊNCIA ARTIFICIAL NO CURSO</span><h2 className="cq-v2-words">{"Quem corrige é a Nidia.".split(" ").map((w, i) => <span key={i} style={{ "--i": i } as React.CSSProperties}>{w} </span>)}<em>{"O critério é dos professores.".split(" ").map((w, i) => <span key={i} style={{ "--i": i + 4 } as React.CSSProperties}>{w} </span>)}</em></h2></div>
          <aside className="cq-v2-quote" data-cq-reveal><p>Os professores da Empiria são advogados das principais bancas de arbitragem do país. Não têm agenda para corrigir cada entrega na unha; têm critério. Esse critério vira rubrica, e a Nidia o aplica em cada entrega, critério por critério, na hora.</p><p className="cq-v2-type">IA para formar, não para substituir.</p></aside>
        </div>
      </section>}
    </main>
  </div></SiteShell></div>;
}
