import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { commerceHead } from "@/lib/commerce-schema";
import { ArrowLeft } from "lucide-react";
export const Route = createFileRoute("/auth")({
  head: () => commerceHead("Entrar", "Acesse sua conta de aluno da Empiria."),
  component: Auth,
});
function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const nav = useNavigate();
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
        if (data.session) await nav({ to: "/minha-conta" });
        else setMessage("Confira seu e-mail para confirmar o cadastro antes de entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await nav({ to: "/minha-conta" });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("email address is not allowed")) {
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
    <SiteShell>
      <main className="account-page auth-page">
        <div className="eyebrow">Portal Empiria</div>
        <h1>
          {mode === "signup" ? "Criar conta" : mode === "reset" ? "Recuperar senha" : "Entrar"}
        </h1>
        <form className="commerce-form" onSubmit={submit}>
          {mode === "signup" && (
            <label className="field">
              Nome completo
              <input name="name" required minLength={2} maxLength={100} autoComplete="name" />
            </label>
          )}
          <label className="field">
            E-mail
            <input name="email" type="email" required maxLength={255} autoComplete="email" />
          </label>
          {mode !== "reset" && (
            <label className="field">
              Senha
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </label>
          )}
          <Button className="btn wide" disabled={busy}>
            {busy
              ? "Aguarde…"
              : mode === "signup"
                ? "Criar conta"
                : mode === "reset"
                  ? "Enviar link"
                  : "Entrar"}
          </Button>
          {message && <p role="status" className="muted auth-message">{message}</p>}
        </form>
        <div className="auth-secondary">
          <span>{mode === "signup" ? "Já tem uma conta?" : mode === "reset" ? "Lembrou sua senha?" : "Ainda não tem conta?"}</span>
          <Button
            variant="link"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            {mode === "login" ? "Criar conta" : "Entrar"}
          </Button>
        </div>
        {mode === "login" && <div className="auth-recovery">
          <Button
            variant="link"
            onClick={() => {
              setMode(mode === "reset" ? "login" : "reset");
              setMessage("");
            }}
          >
            {mode === "reset" ? "Voltar para entrar" : "Esqueci minha senha"}
          </Button>
        </div>}
        <Link to="/cursos" className="auth-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar aos cursos
        </Link>
      </main>
    </SiteShell>
  );
}
