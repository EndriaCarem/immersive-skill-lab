import { createFileRoute } from "@tanstack/react-router";
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

function Landing() {
  return (
    <SiteShell>
      <div className="v10" dangerouslySetInnerHTML={{ __html: HOME_V10_HTML }} />
    </SiteShell>
  );
}
