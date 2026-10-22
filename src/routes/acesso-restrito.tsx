import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commerceHead } from "@/lib/commerce-schema";
import { safeAccessReturn, SITE_LAUNCH_DATE } from "@/lib/site-access";
import logo from "@/assets/empiria-logo.png.asset.json";
import workspace from "@/assets/auth-workspace.jpg";

export const Route = createFileRoute("/acesso-restrito")({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: safeAccessReturn(search["returnTo"]) }),
  head: () => ({ ...commerceHead("Lançamento oficial · Acesso restrito", "A Empiria será lançada oficialmente em 28 de outubro de 2026. Acesso restrito a convidados."), meta: [...commerceHead("Lançamento oficial · Acesso restrito", "A Empiria será lançada oficialmente em 28 de outubro de 2026. Acesso restrito a convidados.").meta, { name: "robots", content: "noindex, nofollow" }] }),
  component: RestrictedAccess,
});

function RestrictedAccess() {
  const { returnTo } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/public/acesso-restrito", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
      if (!response.ok) { setError("Acesso não autorizado. Confira o identificador e a senha."); return; }
      window.location.assign(safeAccessReturn(returnTo));
    } catch { setError("Não foi possível verificar o acesso. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <main className="launch-access">
    <section className="launch-access-intro">
      <img src={logo.url} alt="Empiria" className="launch-access-logo" />
      <div><span className="launch-access-label">LANÇAMENTO OFICIAL</span><h1>A prática tem<br />data para começar.</h1><p>A plataforma Empiria será lançada oficialmente em <strong>{SITE_LAUNCH_DATE}</strong>.</p><p>Em breve, você poderá viver a rotina de um escritório simulado e desenvolver segurança para atuar.</p></div>
      <img src={workspace} alt="Mesa de trabalho com caderno e computador" className="launch-access-photo" />
    </section>
    <section className="launch-access-panel"><div className="launch-access-form">
      <LockKeyhole size={28} aria-hidden="true" /><h2>Acesso restrito</h2><p>Antes do lançamento, a entrada é exclusiva para pessoas autorizadas.</p>
      <form onSubmit={submit}>
        <label className="field">E-mail ou identificador<input name="username" autoComplete="username" required maxLength={100} /></label>
        <label className="field">Senha<span className="auth-input-wrap"><input name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={128} /><Button type="button" size="icon" variant="ghost" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</Button></span></label>
        <Button type="submit" className="btn" disabled={busy}>{busy ? "Verificando…" : "Acessar plataforma"}<ArrowRight size={18} /></Button>
        {error && <p role="alert" className="launch-access-error">{error}</p>}
      </form>
    </div><small>Empiria · Formação jurídica prática</small></section>
  </main>;
}