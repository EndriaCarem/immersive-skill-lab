import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { fmt } from "@/lib/store";
import { verifyCertificate } from "@/lib/completion.functions";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ScoreChip } from "@/components/ReviewWindow";
import logo from "@/assets/empiria-logo.png.asset.json";

export const Route = createFileRoute("/certificado/$code")({
  loader: ({ params }) => verifyCertificate({ data: { code: params.code } }),
  head: ({ params }) => ({
    meta: [
      { title: `Certificado ${params.code} — Empiria` },
      { name: "description", content: "Certificado digital com nota e verificação pública por código." },
      { property: "og:title", content: `Certificado ${params.code} — Empiria` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Certificado com nota por critério, verificável por link." },
    ],
  }),
  component: CertPage,
});

function CertPage() {
  const { code } = Route.useParams();
  const cert = Route.useLoaderData();
  const parsed = z.array(z.object({ activityId: z.string(), title: z.string(), score: z.number(), passed: z.boolean() })).safeParse(cert?.activities);
  const rows = parsed.success ? parsed.data : [];
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  if (!cert)
    return (
      <AppShell>
        <div className="cert-wrap">
          <div className="cert">
            <div className="k">Verificação pública</div>
            <h2>Código {code} não encontrado</h2>
            <p className="muted">Confira o código informado no certificado.</p>
            <Link to="/" className="btn ghost">
              Voltar
            </Link>
          </div>
        </div>
      </AppShell>
    );
  const issued = new Date(cert.issued_at);
  const name = cert.program_title;
  const linkedinAdd =
    "https://www.linkedin.com/profile/add?" +
    new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name,
      organizationName: "Empiria",
      issueYear: String(issued.getFullYear()),
      issueMonth: String(issued.getMonth() + 1),
      certUrl: url,
      certId: cert.code,
    }).toString();
  const linkedinShare = "https://www.linkedin.com/sharing/share-offsite/?" + new URLSearchParams({ url }).toString();

  return (
    <AppShell>
      <div className="cert-wrap">
        <div className="cert">
          <img src={logo.url} alt="Empiria" style={{ height: 40, margin: "0 auto 26px" }} />
          <div className="k">Certificado de conclusão</div>
          <h2>{name}</h2>
          <div className="who">
            Conferido a <b style={{ color: "var(--ink)" }}>{cert.student_name}</b> · {rows.length} atividades com avaliação individual por critério
          </div>
          <div className="grade">{fmt(cert.grade)}</div>
          <div className="glab">Nota final</div>
          <table className="rubric" style={{ margin: "18px 0", textAlign: "left" }}>
            <thead><tr><th>Atividade</th><th className="sc">Nota</th></tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.activityId}><td>{i + 1}. {row.title}</td><td className="sc"><ScoreChip n={Math.round(row.score * 10) / 10} /></td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted sm">Certificado de curso livre. Não é certificado de estágio nem de presença: cada nota vem de uma peça corrigida por critério.</p>
          <p className="muted sm">Nota mínima 5 em cada atividade · melhor entrega válida · revisões humanas concluídas.</p>
          <div className="code">
            Verificação pública · código <b>{cert.code}</b> · emitido em {issued.toLocaleDateString("pt-BR")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <a className="btn" href={linkedinAdd} target="_blank" rel="noreferrer">
            Adicionar ao perfil do LinkedIn
          </a>
          <a className="btn ghost" href={linkedinShare} target="_blank" rel="noreferrer">
            Compartilhar no LinkedIn
          </a>
          <Button className="btn ghost" onClick={() => navigator.clipboard?.writeText(url)}>
            Copiar link de verificação
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
