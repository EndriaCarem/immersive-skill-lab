import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NotFoundBlock } from "@/components/ActivityLayout";
import { actions, brl, useStore } from "@/lib/store";

export const Route = createFileRoute("/programa/$slug")({
  head: () => ({
    meta: [
      { title: "Programa — Empiria" },
      { name: "description", content: "Apresentação do programa, habilidades desenvolvidas e atividades encadeadas." },
      { property: "og:title", content: "Programa — Empiria" },
      { property: "og:description", content: "Conheça as atividades e inscreva-se." },
    ],
  }),
  component: ProgramPage,
});

function ProgramPage() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const program = useStore((s) => s.programs.find((p) => p.slug === slug));
  const enrolled = useStore((s) => !!program && s.enrollments.some((e) => e.programId === program.id && e.student === s.student));
  if (!program) return <NotFoundBlock />;
  const start = () => {
    actions.enroll(program.id);
    if (program.activities.length) nav({ to: "/estagio/$slug/$n/caso", params: { slug, n: "1" } });
  };
  return (
    <AppShell>
      <div className="body">
        <aside className="rail">
          <div className="eyebrow">{program.kind}</div>
          <h1 style={{ fontSize: 26 }}>{program.title}</h1>
          <p>{program.description}</p>
          <div className="chips">
            <span className="chip">{program.activities.length} atividades</span>
            <span className="chip">No seu ritmo</span>
            <span className="chip">Certificado com nota</span>
          </div>
          <div className="price" style={{ fontSize: 28, fontWeight: 700, color: "var(--plum)", margin: "6px 0 14px" }}>
            {brl(program.price)}
          </div>
          <button className="btn wide" onClick={start} disabled={!program.activities.length}>
            {enrolled ? "Continuar programa" : "Adquirir programa"}
          </button>
          <p className="muted sm" style={{ marginTop: 10 }}>
            Acesso permanente ao conteúdo adquirido.
          </p>
          {program.skills.length > 0 && (
            <>
              <h4>Habilidades</h4>
              <div className="chips">
                {program.skills.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}
        </aside>
        <main className="pane">
          <h3>As atividades</h3>
          <p className="muted">Cada uma entra como uma demanda real: você recebe, produz e é avaliado por critério.</p>
          <ul className="acts">
            {program.activities.map((a, i) => (
              <li key={a.id}>
                <span className="num">{i + 1}</span>
                <span>
                  <span className="ttl">{a.title}</span>
                  <div className="meta">
                    {a.duration} · {a.summary.charAt(0).toLowerCase() + a.summary.slice(1)}
                  </div>
                </span>
              </li>
            ))}
          </ul>
          <Link to="/" className="btn ghost" style={{ marginTop: 18 }}>
            Voltar ao catálogo
          </Link>
        </main>
      </div>
    </AppShell>
  );
}
