import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso e matrícula — Empiria" },
      { name: "description", content: "Termos de uso da plataforma e de matrícula nos cursos da Empiria." },
      { property: "og:title", content: "Termos de uso e matrícula — Empiria" },
      { property: "og:description", content: "Termos de uso da plataforma e de matrícula nos cursos da Empiria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  const [terms, setTerms] = useState<Tables<"commerce_terms"> | null | undefined>(undefined);
  useEffect(() => {
    supabase.from("commerce_terms").select("*").eq("published", true).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => setTerms(data?.[0] ?? null));
  }, []);
  return (
    <SiteShell>
      <main className="wrap legal-page">
        <span className="pillbadge soft">✦ Termos</span>
        <h1 className="display" style={{ textAlign: "left" }}>Termos de uso e matrícula</h1>
        {terms === undefined ? <p className="muted">Carregando…</p> : terms ? (
          <>
            <p className="legal-note">Versão {terms.version} · publicada em {new Date(terms.created_at).toLocaleDateString("pt-BR")}</p>
            <div className="legal-body">{terms.body}</div>
          </>
        ) : (
          <p className="legal-note">Os termos de matrícula estão em revisão jurídica e serão publicados aqui antes da abertura das matrículas.</p>
        )}
        <p className="muted sm">Saiba como tratamos seus dados em <Link to="/privacidade">Privacidade e LGPD</Link>.</p>
      </main>
    </SiteShell>
  );
}
