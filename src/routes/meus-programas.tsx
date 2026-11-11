import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LearnerShell } from "@/components/LearnerShell";
import { ArrowRight, CalendarDays, BookOpen, CheckCheck, GraduationCap } from "lucide-react";
import practicalCover from "@/assets/cover-pratico.jpg";
import theoreticalCover from "@/assets/cover-teorico.jpg";
import { useAccount } from "@/lib/account";
import { accountData } from "@/lib/commerce.functions";
import { commerceHead } from "@/lib/commerce-schema";
import { useLearning } from "@/lib/learning";
import { learningProgress, currentSubmission } from "@/lib/learning-rules";
import { fmt } from "@/lib/store";
import { deliveryStatusLabel } from "@/lib/ai-grading-rules";
import { certificateStanding } from "@/lib/completion-rules";
import { issueRealCertificate } from "@/lib/completion.functions";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/meus-programas")({
  head: () => commerceHead("Meus programas", "Acompanhe suas matrículas da Empiria."),
  component: Portal,
});
function Portal() {
  const learning = useLearning();
  const { user, ready } = useAccount();
  const fetch = useServerFn(accountData);
  const [data, setData] = useState<Awaited<ReturnType<typeof accountData>> | null>(null);
  const [error, setError] = useState("");
  const issue = useServerFn(issueRealCertificate);
  const navigate = useNavigate();
  const [issuing, setIssuing] = useState(false);
  async function certificate(programId: string) {
    setIssuing(true); setError("");
    try { const code = await issue({ data: { programId } }); await navigate({ to: "/certificado/$code", params: { code } }); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível emitir o certificado."); }
    finally { setIssuing(false); }
  }
  useEffect(() => {
    setData(null);
    if (!user) return;
    let active = true;
    void fetch()
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar suas matrículas.");
      });
    return () => {
      active = false;
    };
  }, [user, fetch]);
  return (
    <LearnerShell>
      <main className="account-page learner-portal">
        <header className="learner-portal-heading"><div><div className="eyebrow">Seu aprendizado</div>
        <h1>Meus programas</h1><p className="muted">{user ? `Olá, ${String(user.user_metadata?.["full_name"] ?? "").split(" ")[0] || "bem-vindo"}. Bom ter você por aqui.` : "Seu próximo passo começa aqui."}</p></div><span className="learner-heading-icon"><GraduationCap size={32} aria-hidden="true" /></span></header>
        {!ready ? (
          <p>Carregando…</p>
        ) : !user ? (
          <>
            <p>Entre para consultar suas matrículas.</p>
            <Link to="/auth" className="btn">
              Entrar
            </Link>
          </>
        ) : (
          <>
            {error ? (
              <p role="alert">{error}</p>
            ) : !data ? (
              <p>Carregando matrículas…</p>
            ) : (
              <>
                <div className="learner-section-heading"><h2><BookOpen size={19} /> Seus cursos</h2><Link to="/cursos">Explorar cursos <ArrowRight size={16} /></Link></div>
                {!data.enrollments.some((e) => e.status === "active") && (
                  <>
                    <p className="muted">Você ainda não tem matrículas ativas.</p>
                    <Link to="/cursos" className="btn ghost">
                      Ver cursos
                    </Link>
                  </>
                )}
                <div className="learner-course-grid">{data.enrollments
                  .filter((e) => e.status === "active" && (!e.expires_at || new Date(e.expires_at).getTime() > Date.now()))
                  .map((e) => (
                    <article className="learner-course-card" key={e.id}>
                      <div className="learner-course-cover"><img src={(e.commerce_products?.title ?? "").includes("Teórico") ? theoreticalCover : practicalCover} alt="" /><span className="sig ok"><CheckCheck size={13} /> Matrícula ativa</span></div>
                      <div className="learner-course-card-body"><h2>{e.commerce_products?.title ?? learning.data?.programs.find(p => p.id === e.product_id)?.title ?? "Curso matriculado"}</h2>
                      <p className="muted sm learner-enrollment-date"><CalendarDays size={14} />
                        Matriculado em {new Date(e.enrolled_at).toLocaleDateString("pt-BR")}
                        {e.expires_at && <> · Acesso até {new Date(e.expires_at).toLocaleDateString("pt-BR")}</>}
                      </p>
                      {(() => {
                        const program = learning.data?.programs.find(p => p.id === e.product_id);
                        if (!program) return <p>{learning.isLoading ? "Carregando atividades…" : learning.error ? "Não foi possível carregar suas atividades." : "Conteúdo indisponível para esta matrícula."}</p>;
                        const progress = learningProgress(program, learning.data?.submissions ?? []);
                        return <>
                          <div className="learner-progress-label"><span>{progress.done} de {progress.total} atividades entregues</span><b>{Math.round(progress.total ? progress.done / progress.total * 100 : 0)}%</b></div><progress className="learner-progress" value={progress.done} max={progress.total || 1} aria-label="Progresso do curso" />
                          <Link className="btn" to="/estagio/$slug/$n/caso" params={{ slug: program.slug, n: String(progress.next + 1) }}>{progress.done ? "Continuar programa" : "Iniciar programa"}<ArrowRight size={17} /></Link>
                          <details className="learner-activity-history"><summary>Atividades e devolutivas</summary><ul className="clean">{program.activities.map((a, i) => {
                            const sub = currentSubmission(learning.data?.submissions ?? [], program.id, a.id);
                            return <li key={a.id}>{a.shortTitle} — {sub ? deliveryStatusLabel(sub, fmt) : "Não entregue"}
                              {sub && <> · <Link to="/estagio/$slug/$n/devolutiva" params={{ slug: program.slug, n: String(i + 1) }}>Ver devolutiva</Link></>}
                            </li>;
                          })}</ul></details>
                          {certificateStanding(program, learning.data?.submissions ?? []).eligible ? <Button className="btn ghost" disabled={issuing} onClick={() => void certificate(program.id)}>{issuing ? "Emitindo…" : "Emitir certificado"}</Button> : <p className="muted sm">Certificado: nota mínima 5 em cada atividade e revisões concluídas. As próximas atividades continuam disponíveis conforme suas entregas.</p>}
                        </>;
                      })()}
                    </div></article>
                  ))}</div>
              </>
            )}
          </>
        )}
      </main>
    </LearnerShell>
  );
}
