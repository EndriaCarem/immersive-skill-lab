import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { SiteShell } from "@/components/AppShell";
import { SOBRE_V10_HTML } from "@/lib/sobre-v10";
import { founders } from "@/lib/founders";
import ibrawork from "@/assets/sobre-ibrawork.png.asset.json";
import nidia from "@/assets/sobre-nidia.png.asset.json";
import thomas from "@/assets/sobre-thomas.jpg.asset.json";
import homeV10Css from "@/styles/home-v10.css?url";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Quem somos — Empiria" },
      { name: "description", content: "Empiria é o conhecimento que vem da experiência: as fundadoras Rebeca Franzoni e Tainá Malta, o Ibrawork, a Nidia e quem ensina." },
      { property: "og:title", content: "Quem somos — Empiria" },
      { property: "og:description", content: "Empiria é o conhecimento que vem da experiência." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: homeV10Css }],
  }),
  component: About,
});

const HTML = SOBRE_V10_HTML
  .replaceAll("%%REBECA%%", founders[0].photo)
  .replaceAll("%%TAINA%%", founders[1].photo)
  .replaceAll("%%IBRAWORK%%", ibrawork.url)
  .replaceAll("%%NIDIA%%", nidia.url)
  .replaceAll("%%THOMAS%%", thomas.url);

const REVEALS: [string, string][] = [
  [".pagehead > *", "v-up"],
  [".sec-head, .ghead, .sublabel2", "v-up"],
  [".beliefs > *", "v-zoom"],
  [".people.two > *", "v-flip"],
  [".people.three > *", "v-tilt"],
  [".final", "v-zoom"],
];

function About() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("v-in"); else if (e.boundingClientRect.top > 0) e.target.classList.remove("v-in"); }), { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
    REVEALS.forEach(([sel, cls]) => node.querySelectorAll<HTMLElement>(sel).forEach((el, i) => {
      el.classList.add("v-rv", cls);
      el.style.setProperty("--vd", String(i % 4));
      io.observe(el);
    }));
    return () => io.disconnect();
  }, []);
  return (
    <SiteShell>
      <div ref={root} className="v10 v10-anim" dangerouslySetInnerHTML={{ __html: HTML }} />
    </SiteShell>
  );
}
