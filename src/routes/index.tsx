import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { SiteShell } from "@/components/AppShell";
import { HOME_V10_HTML } from "@/lib/home-v10";
import homeV10Css from "@/styles/home-v10.css?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Empiria — Escritório simulado de arbitragem" },
      { name: "description", content: "Não é um curso sobre arbitragem; é o que você redige quando o caso chega. Demandas reais, revisão de sênior e nota por critério." },
      { property: "og:title", content: "Empiria — No padrão das grandes bancas" },
      { property: "og:description", content: "Não é um curso sobre arbitragem; é o que você redige quando o caso chega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: homeV10Css }],
  }),
  component: Landing,
});

/** Each group gets its own entrance effect when scrolled into view. */
const REVEALS: [string, string][] = [
  [".sec-head, .eyebrow", "v-up"],
  [".logos", "v-fade"],
  [".cmp > *", "v-flip"],
  [".feat .copy", "v-right"],
  [".feat .panel", "v-left"],
  [".matrow > *, .ai-grid .big", "v-zoom"],
  [".ai-grid > *, .ai-one", "v-tilt"],
  ["details", "v-up"],
  [".final", "v-zoom"],
];

function Landing() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle("v-in", e.isIntersecting)), { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
    REVEALS.forEach(([sel, cls]) => node.querySelectorAll<HTMLElement>(sel).forEach((el, i) => {
      if (el.closest(".hero")) return;
      el.classList.add("v-rv", cls);
      el.style.setProperty("--vd", String(i % 4));
      io.observe(el);
    }));
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        node.style.setProperty("--vy", String(window.scrollY));
        node.querySelectorAll<HTMLElement>(".feat .panel").forEach((el) => {
          const r = el.getBoundingClientRect();
          const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
          el.style.setProperty("--vp", String(Math.max(-1, Math.min(1, p))));
        });
      });
    };
    const onMove = (ev: PointerEvent) => {
      const el = (ev.target as HTMLElement).closest<HTMLElement>(".feat, .cmp > *, .ai-grid > *");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${ev.clientX - r.left}px`);
      el.style.setProperty("--my", `${ev.clientY - r.top}px`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    node.addEventListener("pointermove", onMove);
    onScroll();
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); node.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <SiteShell>
      <div ref={root} className="v10 v10-anim" dangerouslySetInnerHTML={{ __html: HOME_V10_HTML }} />
    </SiteShell>
  );
}
