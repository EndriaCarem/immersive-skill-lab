import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAccount } from "@/lib/account";
import { accountData } from "@/lib/commerce.functions";
import { commerceHead } from "@/lib/commerce-schema";
import { useLearning } from "@/lib/learning";
import { learningProgress, currentSubmission } from "@/lib/learning-rules";
import { fmt, subScore } from "@/lib/store";
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
    <AppShell>
      <main className="account-page">
        <div className="eyebrow">Portal do aluno</div>
        <h1>Meus programas</h1>
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
            <nav className="commerce-actions">
              <Link to="/minha-conta">Minha conta</Link>
              <Link to="/compras">Minhas compras</Link>
            </nav>
            {error ? (
              <p role="alert">{error}</p>
            ) : !data ? (
              <p>Carregando matrículas…</p>
            ) : (
              <>
                {!data.enrollments.some((e) => e.status === "active") && (
                  <>
                    <p className="muted">Você ainda não tem matrículas ativas.</p>
                    <Link to="/cursos" className="btn ghost">
                      Ver cursos
                    </Link>
                  </>
                )}
                {data.enrollments
                  .filter((e) => e.status === "active")
                  .map((e) => (
                    <article className="order-row" key={e.id}>
                      <h3>{e.commerce_products?.title}</h3>
                      <span className="sig ok">Matrícula ativa</span>
                      <p className="muted sm">
                        Matriculado em {new Date(e.enrolled_at).toLocaleDateString("pt-BR")}
                      </p>
                      {(() => {
                        const program = learning.data?.programs.find(p => p.id === e.product_id);
                        if (!program) return <p>{learning.isLoading ? "Carregando atividades…" : learning.error ? "Não foi possível carregar suas atividades." : "Conteúdo indisponível para esta matrícula."}</p>;
                        const progress = learningProgress(program, learning.data?.submissions ?? []);
                        return <>
                          <p>{progress.done} de {progress.total} atividades entregues</p>
                          <Link className="btn" to="/estagio/$slug/$n/caso" params={{ slug: program.slug, n: String(progress.next + 1) }}>{progress.done ? "Continuar programa" : "Iniciar programa"}</Link>
                          <ul className="clean">{program.activities.map((a, i) => {
                            const sub = currentSubmission(learning.data?.submissions ?? [], program.id, a.id);
                            return <li key={a.id}>{a.shortTitle} — {sub ? sub.grades ? `Nota ${fmt(subScore(sub))}` : "Aguardando correção" : "Não entregue"}
                              {sub && <> · <Link to="/estagio/$slug/$n/devolutiva" params={{ slug: program.slug, n: String(i + 1) }}>Ver devolutiva</Link></>}
                            </li>;
                          })}</ul>
                        </>;
                      })()}
                    </article>
                  ))}
              </>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
