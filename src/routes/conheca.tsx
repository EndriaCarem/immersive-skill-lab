import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, FileText, Play, Mail } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { ReviewWindow } from "@/components/ReviewWindow";
import { MaterialCapture } from "@/components/MaterialCapture";
import { Button } from "@/components/ui/button";
import { canCaptureMaterial, materialCampaign } from "@/lib/material-campaign";

export const Route = createFileRoute("/conheca")({
  head: () => ({ meta: [
    { title: "Conheça a Empiria — Da demanda à entrega" },
    { name: "description", content: "Conheça a experiência da Empiria e acesse um material gratuito sobre a prática da arbitragem." },
    { property: "og:title", content: "Conheça a Empiria — Da demanda à entrega" },
    { property: "og:description", content: "Uma apresentação da plataforma e um novo ponto de partida para a sua prática jurídica." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CampaignPage,
});

function useCampaignMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const groups: [string, string][] = [
      [".material-intro > *", "up"],
      [".material-steps > li", "pop"],
      [".material-resource-copy > *", "left"],
      [".material-access", "zoom"],
      [".material-closing > *", "up"],
      [".mfoot-brand > *, .mfoot-logos > img, .mfoot-partners > h5", "up"],
    ];
    const els: HTMLElement[] = [];
    groups.forEach(([q, v]) => document.querySelectorAll<HTMLElement>(q).forEach((el) => { if (!els.includes(el)) { el.dataset["sr"] = v; els.push(el); } }));
    els.forEach((el) => {
      const i = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
      el.style.setProperty("--sr-d", `${Math.min(i, 6) * 120}ms`);
      el.classList.add("sr");
    });
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("sr-in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    // Video grows from a tilted card into full view as it scrolls in.
    const player = document.querySelector<HTMLElement>(".material-player");
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      if (!player) return;
      const r = player.getBoundingClientRect(); const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
      player.style.setProperty("--mp", p.toFixed(3));
    }); };
    player?.classList.add("mp-anim");
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
}

function CampaignPage() {
  useCampaignMotion();
  const [completed, setCompleted] = useState(false);
  const available = canCaptureMaterial(materialCampaign.videoUrl, materialCampaign.pdfUrl, completed);
  return <SiteShell minimalFooter><main className="material-page">
    <section className="material-intro wrap">
      <span className="material-eyebrow">UM NOVO PONTO DE PARTIDA</span>
      <h1>Empiria.<br /><span>A prática começa aqui.</span></h1>
      <p>Antes da sua primeira demanda, conheça o escritório simulado onde você constrói suas entregas e desenvolve segurança para atuar.</p>
      <Button variant="ghost" className="material-jump" onClick={() => document.getElementById("apresentacao")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Conheça a experiência <ArrowDown size={18} /></Button>
    </section>

    <section id="apresentacao" className="wrap material-experience" aria-label="Apresentação da Empiria">
      <div className="material-player">
        {materialCampaign.videoUrl ? <video controls autoPlay muted playsInline preload="auto" onEnded={() => setCompleted(true)} aria-label="Vídeo de apresentação da Empiria"><source src={materialCampaign.videoUrl} /></video> : <div className="material-preview">
          <div className="material-preview-heading"><span className="material-play-mark"><Play size={22} /></span><div><h2>Da demanda à entrega.</h2><p>Um primeiro olhar para a experiência Empiria.</p></div></div>
          <div className="material-document"><ReviewWindow compact /></div>
          <div className="material-pending"><span className="material-status-dot" />Vídeo de apresentação em preparação</div>
        </div>}
      </div>
      <ol className="material-steps" aria-label="Etapas para acessar o material">
        <li className="active"><span>01</span><div><b>Conheça a Empiria</b><small>Assista à apresentação</small></div></li>
        <li className={completed ? "active" : ""}><span>02</span><div><b>Deixe seu e-mail</b><small>Depois de assistir ao vídeo</small></div></li>
        <li><span>03</span><div><b>Receba o material</b><small>PDF gratuito para download</small></div></li>
      </ol>
    </section>

    <section className="material-resource">
      <div className="wrap material-resource-inner">
        <div className="material-resource-copy"><span className="material-eyebrow">PARA LEVAR COM VOCÊ</span><h2>Conhecimento que vai<br />além da apresentação.</h2><p>Um material gratuito para aprofundar seu olhar sobre a prática da arbitragem.</p><div className="material-resource-meta"><FileText size={18} /><span>Formato PDF</span><span>Conteúdo gratuito</span></div></div>
        <div className="material-access">
          {available && materialCampaign.pdfUrl ? <><h3>Continue sua jornada.</h3><p>Informe seus dados para liberar o download.</p><MaterialCapture pdfUrl={materialCampaign.pdfUrl} /></> : <><Mail size={26} /><h3>{materialCampaign.videoUrl ? "Seu próximo passo vem depois do vídeo." : "Seu próximo passo está chegando."}</h3><p>{materialCampaign.videoUrl ? "Assista à apresentação completa para liberar esta etapa. O download estará disponível com a publicação do material." : "A apresentação e o material gratuito estão em preparação. Em breve, você poderá assistir, deixar seu e-mail e baixar o PDF."}</p><Button className="btn" disabled><FileText size={16} />Material em breve</Button><small>Sem cadastro por enquanto.</small></>}
        </div>
      </div>
    </section>
    <section className="wrap material-closing"><div><span className="material-eyebrow">ENQUANTO ISSO</span><h2>Encontre seu ponto de partida.</h2></div><Button asChild variant="outline" className="btn ghost"><Link to="/cursos">Explorar os cursos <ArrowUpRight size={18} /></Link></Button></section>
  </main></SiteShell>;
}