import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Award, BookOpen, CalendarClock, Check, FileCheck2 } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { NotFoundBlock } from "@/components/ActivityLayout";
import { coverFor } from "@/components/CourseCard";
import { actions, brl, useStore } from "@/lib/store";
import { Rich } from "@/components/Rich";
import { FileList } from "@/components/FileList";
import { useFileUrl } from "@/lib/files";

export const Route = createFileRoute("/programa/$slug")({
  head: () => ({
    meta: [
      { title: "Curso — Empiria" },
      { name: "description", content: "Método, o que você vai dominar e a grade curricular do curso." },
      { property: "og:title", content: "Curso — Empiria" },
      { property: "og:description", content: "Garanta sua vaga na pré-venda." },
    ],
  }),
  component: ProgramPage,
});

const icons = [FileCheck2, BookOpen, Award, CalendarClock];

function ProgramPage() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const program = useStore((s) => s.programs.find((p) => p.slug === slug));
  const coverUrl = useFileUrl(program?.coverFile?.id);
  const enrolled = useStore((s) => !!program && s.enrollments.some((e) => e.programId === program.id && e.student === s.student));
  if (!program) return <NotFoundBlock />;
  const start = () => {
    actions.enroll(program.id);
    if (program.activities.length) nav({ to: "/estagio/$slug/$n/caso", params: { slug, n: "1" } });
  };
  const saving = program.fullPrice && program.price ? Math.round((1 - program.price / program.fullPrice) * 100) : 0;
  const practical = program.kind.toLowerCase().includes("prático");
  return (
    <SiteShell>
      <section className="wrap grid2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 48, paddingTop: 48 }}>
        <div>
          <div className="crumbs">
            <Link to="/cursos">Cursos</Link> › <span>{program.kind}</span> › <b>{program.title}</b>
          </div>
          <h1 className="display" style={{ fontSize: "clamp(38px,5vw,64px)", margin: "18px 0 16px" }}>
            {program.title}
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {program.fullPrice ? <span className="pillbadge">✦ Pré-venda Fenalaw</span> : null}
            <span className="pillbadge soft">{program.kind}</span>
            <span className="muted sm" style={{ marginLeft: 6 }}>
              {program.activities.length} {practical ? "atividades" : "aulas"} · Certificado com nota
            </span>
          </div>

          <h3 style={{ fontSize: 24, marginTop: 40 }}>Sobre o curso</h3>
          {program.descriptionHtml ? <Rich html={program.descriptionHtml} /> : <p style={{ fontSize: 16, color: "var(--slate)" }}>{program.description}</p>}
          {practical && (
            <p style={{ fontSize: 16, color: "var(--slate)" }}>
              Cada atividade parte de um caso construído para o exercício: você recebe o contexto, a sócia pede a peça, você entrega e recebe a
              devolutiva por rubrica — só então o gabarito comentado é liberado.
            </p>
          )}

          {program.learn?.length ? (
            <div className="learn" style={{ marginTop: 30 }}>
              <h3 style={{ fontSize: 22 }}>O que você vai dominar</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
                {program.learn.map((l) => (
                  <li key={l}>
                    <span className="check">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {program.files?.length ? (
            <>
              <h3 style={{ fontSize: 24, marginTop: 44 }}>Materiais do curso</h3>
              <FileList files={program.files} />
            </>
          ) : null}
          <h3 style={{ fontSize: 24, marginTop: 44 }}>Grade curricular</h3>
          <p className="muted">{practical ? "As demandas da banca fictícia, em sequência." : "O procedimento, fase a fase."}</p>
          {program.activities.map((a, i) => (
            <div className="module" key={a.id}>
              <span className="mn">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <b style={{ fontSize: 16 }}>{a.title}</b>
                <div className="muted sm">
                  {a.duration} · {a.summary}
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside>
          <div className="buycard">
            <div className="prev">
              <img src={coverUrl ?? coverFor(program)} alt="" width={1024} height={640} />
            </div>
            <div className="bp">
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span className="amount">{brl(program.price)}</span>
                {saving ? <span className="save">Economize {saving}%</span> : null}
              </div>
              {program.fullPrice ? (
                <div className="muted sm" style={{ marginTop: 6 }}>
                  Tabela cheia <s>{brl(program.fullPrice)}</s>
                </div>
              ) : null}
              <button className="btn wide lg" style={{ marginTop: 18 }} onClick={start} disabled={!program.activities.length}>
                {enrolled ? "Continuar curso" : "Garantir vaga na pré-venda"}
              </button>
              <h4 style={{ marginTop: 24 }}>O curso inclui</h4>
              <ul className="inc" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {(program.includes ?? []).map((t, i) => {
                  const I = icons[i % icons.length]!;
                  return (
                    <li key={t}>
                      <I size={18} />
                      {t}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
