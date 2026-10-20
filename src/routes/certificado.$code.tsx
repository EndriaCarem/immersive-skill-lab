import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { fmt, latestSubmission, subScore, useStore } from "@/lib/store";
import { ScoreChip } from "@/components/ReviewWindow";
import logo from "@/assets/empiria-logo.png.asset.json";

export const Route = createFileRoute("/certificado/$code")({
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
  const cert = useStore((s) => s.certificates.find((c) => c.code === code));
  const program = useStore((s) => s.programs.find((p) => p.id === cert?.programId));
  const rows = useStore((s) =>
    program && cert ? program.activities.map((a) => ({ a, sc: subScore(latestSubmission(s, program.id, a.id, cert.student)) })) : [],
  );
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  if (!cert || !program)
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
  const issued = new Date(cert.issuedAt);
  const name = `${program.kind} — ${program.title}`;
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
            Conferido a <b style={{ color: "var(--ink)" }}>{cert.student}</b> · {program.activities.length} atividades práticas com avaliação individual por critério
          </div>
          <div className="grade">{fmt(cert.grade)}</div>
          <div className="glab">Nota final</div>
          <table className="rubric" style={{ margin: "18px 0", textAlign: "left" }}>
            <thead><tr><th>Atividade</th><th className="sc">Nota</th></tr></thead>
            <tbody>
              {rows.map(({ a, sc }, i) => (
                <tr key={a.id}><td>{i + 1}. {a.shortTitle}</td><td className="sc">{sc == null ? <span className="muted">—</span> : <ScoreChip n={Math.round(sc * 10) / 10} />}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted sm">Certificado de curso livre. Não é certificado de estágio nem de presença: cada nota vem de uma peça corrigida por critério.</p>
          <div className="skills">
            {program.skills.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
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
          <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(url)}>
            Copiar link de verificação
          </button>
        </div>
      </div>
    </AppShell>
  );
}
