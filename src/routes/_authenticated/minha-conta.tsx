import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LearnerShell } from "@/components/LearnerShell";
import { UserRound, Save, LogOut, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountData, saveProfile } from "@/lib/commerce.functions";
import { commerceHead } from "@/lib/commerce-schema";
import { supabase } from "@/integrations/supabase/client";
export const accountOptions = () =>
  queryOptions({ queryKey: ["account"], queryFn: () => accountData() });
export const Route = createFileRoute("/_authenticated/minha-conta")({
  head: () => commerceHead("Configurações da conta", "Atualize seus dados pessoais na Empiria."),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountOptions()),
  component: Account,
});
function Account() {
  const { data } = useSuspenseQuery(accountOptions());
  const save = useServerFn(saveProfile);
  const { queryClient } = Route.useRouteContext();
  const nav = useNavigate();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await save({
        data: {
          full_name: String(f.get("full_name")),
          phone: String(f.get("phone")),
          tax_id: String(f.get("tax_id")),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      setMessage("Dados salvos.");
    } catch {
      setMessage("Não foi possível salvar seus dados.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await nav({ to: "/auth", replace: true });
  }
  return (
    <LearnerShell>
      <main className="account-page learner-portal learner-account">
        <header className="learner-portal-heading"><div><div className="eyebrow">Seu perfil</div><h1>Minha conta</h1><p className="muted">Seus dados pessoais.</p></div><span className="learner-heading-icon"><UserRound size={30} aria-hidden="true" /></span></header>
        <div className="learner-account-layout">
        <aside className="learner-profile-summary">
          <span className="learner-profile-avatar" aria-hidden="true">{data.profile?.full_name?.trim().slice(0, 1).toLocaleUpperCase("pt-BR") || <UserRound size={28} />}</span>
          <strong>{data.profile?.full_name || "Sua conta Empiria"}</strong>
          <span className="learner-profile-caption"><ShieldCheck size={16} /> Conta Empiria</span>
          <nav className="learner-account-links" aria-label="Ações da conta">
          {data.roles.some((x) => x.role === "admin") && (
            <Link to="/admin" className="btn learner-admin-cta">
              Ir para a administração <ArrowUpRight size={16} />
            </Link>
          )}
          <Button variant="ghost" onClick={logout}>
            <LogOut size={16} /> Sair da conta
          </Button>
          </nav>
        </aside>
        <section className="learner-profile-fields" aria-labelledby="profile-fields-title">
        <h2 id="profile-fields-title">Dados pessoais</h2>
        <form className="commerce-form" onSubmit={submit}>
          <label className="field">
            Nome completo
            <input
              name="full_name"
              defaultValue={data.profile?.full_name}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <div className="interest-fields">
            <label className="field">
              Telefone
              <input
                name="phone"
                defaultValue={data.profile?.phone}
                maxLength={25}
                autoComplete="tel"
              />
            </label>
            <label className="field">
              CPF / CNPJ
              <input name="tax_id" defaultValue={data.profile?.tax_id} maxLength={25} />
            </label>
          </div>
          <div className="learner-form-footer"><Button className="btn" disabled={busy}>
            <Save size={16} /> {busy ? "Salvando…" : "Salvar dados"}
          </Button><p role="status">{message}</p></div>
        </form>
        </section>
        </div>
      </main>
    </LearnerShell>
  );
}
