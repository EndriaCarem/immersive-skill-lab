import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { InterestForm } from "@/components/InterestForm";

export const Route = createFileRoute("/interesse")({
  validateSearch: z.object({ curso: z.string().trim().max(160).catch("").default("") }),
  head: () => ({ meta: [
    { title: "Registre seu interesse — Empiria" },
    { name: "description", content: "Entre em contato com a Empiria sobre cursos de arbitragem e próximos lançamentos." },
    { property: "og:title", content: "Registre seu interesse — Empiria" },
    { property: "og:description", content: "Deixe seu interesse em cursos e próximos lançamentos da Empiria." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: InterestPage,
});

function InterestPage() {
  const { curso } = Route.useSearch();
  return <SiteShell><main className="wrap interest-page">
    <div className="interest-intro">
      <Link to="/cursos" className="back-link"><ArrowLeft size={16} /> Cursos</Link>
      <span className="h-eyebrow">Empiria</span>
      <h1 className="display">Seu próximo passo na prática.</h1>
      <p className="lead">{curso ? `Interesse em ${curso}.` : "Converse com a Empiria sobre a formação ou os próximos cursos."}</p>
    </div>
    <InterestForm key={curso} initialInterest={curso} />
  </main></SiteShell>;
}