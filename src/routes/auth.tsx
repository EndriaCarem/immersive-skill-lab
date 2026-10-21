import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { accountData } from "@/lib/commerce.functions";
import { postLoginDestination } from "@/lib/post-login";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { commerceHead } from "@/lib/commerce-schema";
import { ArrowLeft, ArrowRight, Mail, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { authErrorKind } from "@/lib/auth-errors";
import logo from "@/assets/empiria-logo.png.asset.json";
import workspace from "@/assets/auth-workspace.jpg";
export const Route = createFileRoute("/auth")({
  head: () => commerceHead("Entrar", "Acesse sua conta de aluno da Empiria."),
  component: Auth,
});
function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const nav = useNavigate();
  const readAccount = useServerFn(accountData);
  async function enterAccount() {
    let destination: "/cursos" | "/compras" = "/compras";
    try {
      destination = postLoginDestination(await readAccount());
    } catch {
      // Preserve a recoverable purchases screen rather than assuming no orders.
    }
    await nav({ to: destination, replace: true });
  }
  function changeMode(next: "login" | "signup" | "reset") {
    setMode(next);
    setMessage("");
    setShowPassword(false);
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      z.string().trim().email().max(255).parse(email);
      if (mode !== "reset") z.string().min(8).max(128).parse(password);
      if (mode === "signup")
        z.string()
          .trim()
          .min(2)
          .max(100)
          .parse(String(form.get("name") ?? ""));
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage(
          "Se houver uma conta para este e-mail, você receberá o link para redefinir a senha.",
        );
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: String(form.get("name") ?? "").trim() },
          },
        });
        if (error) throw error;
        if (data.session) await enterAccount();
        else await nav({ to: "/confirmar-cadastro", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await enterAccount();
      }
    } catch (error) {
      if (authErrorKind(error) === "weak_password") {
        setMessage("Essa senha é muito comum ou fácil de adivinhar. Escolha uma senha única e mais longa, evitando nomes, datas e sequências como 12345678.");
      } else if (authErrorKind(error) === "invalid_email") {
        setMessage("Use um e-mail válido que possa receber a confirmação do cadastro.");
      } else
        setMessage(
          mode === "login"
            ? "Não foi possível entrar. Confira e-mail, senha e confirmação do cadastro."
            : "Não foi possível concluir. Tente novamente em alguns instantes.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-clean">
      <aside className="auth-scene" aria-label="Empiria — formação jurídica prática">
        <img className="auth-scene-photo" src={workspace} alt="Mesa de trabalho com computador, caderno e caneta" width={1024} height={1536} />
        <Link to="/" className="auth-brand" aria-label="Empiria — início"><img src={logo.url} alt="Empiria" /></Link>
        <div className="auth-scene-copy">
          <h2>O próximo passo<br />é <em>na prática.</em></h2>
          <p>Não é um curso sobre arbitragem; é o que você redige quando o caso chega.</p>
        </div>
        <small className="auth-scene-footer">© {new Date().getFullYear()} Empiria · Formação jurídica prática</small>
      </aside>
      <section className="auth-panel">
        <div className="auth-clean-switch">
          <span>{mode === "login" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}</span>
          <Button type="button" variant="link" onClick={() => changeMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Criar conta" : "Entrar"}</Button>
        </div>
        <div className="auth-clean-content">
          <Link to="/" className="auth-brand auth-form-brand" aria-label="Empiria — início"><img src={logo.url} alt="Empiria" /></Link>
          <h1>{mode === "signup" ? "Crie sua conta" : mode === "reset" ? "Recuperar senha" : "Bem-vindo de volta!"}</h1>
          <p className="auth-intro">{mode === "signup" ? "Seu próximo capítulo começa aqui." : mode === "reset" ? "Receba no seu e-mail um link para redefinir sua senha." : "Entre para continuar sua jornada."}</p>
        <form className="auth-clean-form" onSubmit={submit}>
          {mode === "signup" && (
            <label className="field">
              Nome completo
              <input name="name" required minLength={2} maxLength={100} autoComplete="name" />
            </label>
          )}
          <label className="field">
            E-mail
            <span className="auth-input-wrap"><Mail size={18} aria-hidden="true" /><input name="email" type="email" placeholder="seu@email.com" required maxLength={255} autoComplete="email" /></span>
          </label>
          {mode !== "reset" && (
            <label className="field">
              Senha
              <span className="auth-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={mode === "signup" ? "Crie sua senha" : "Digite sua senha"}
                required
                minLength={8}
                maxLength={128}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              /><Button type="button" variant="ghost" size="icon" className="auth-password-toggle" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</Button></span>
            </label>
          )}
          {mode === "login" && <div className="auth-clean-recovery"><Button type="button" variant="link" onClick={() => changeMode("reset")}>Esqueci minha senha</Button></div>}
          <Button className="btn auth-clean-submit" disabled={busy}>
            {busy
              ? "Aguarde…"
              : mode === "signup"
                ? "Criar conta"
                : mode === "reset"
                  ? "Enviar link"
                   : "Entrar"}<ArrowRight size={18} aria-hidden="true" />
          </Button>
          {message && <p role="status" className="muted auth-message">{message}</p>}
        </form>
        <Link to="/cursos" className="auth-clean-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar aos cursos
        </Link>
        </div>
        <div className="auth-clean-legal"><Link to="/termos">Termos de uso</Link><span>·</span><Link to="/privacidade">Privacidade e LGPD</Link></div>
      </section>
    </main>
  );
}
