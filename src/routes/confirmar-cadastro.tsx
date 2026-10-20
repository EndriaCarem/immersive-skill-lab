import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck, ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { commerceHead } from "@/lib/commerce-schema";

export const Route = createFileRoute("/confirmar-cadastro")({
  head: () => commerceHead("Confirme seu cadastro", "Confirme seu e-mail para acessar sua conta na Empiria."),
  component: ConfirmSignup,
});

function ConfirmSignup() {
  return (
    <SiteShell>
      <main className="account-page auth-page text-center">
        <MailCheck size={48} strokeWidth={1.5} className="mx-auto mb-6 text-primary" aria-hidden="true" />
        <div className="eyebrow">Portal Empiria</div>
        <h1>Confirme seu e-mail</h1>
        <p className="mt-6 text-muted-foreground">Falta só confirmar seu endereço de e-mail para concluir o cadastro.</p>
        <p className="mt-4 text-muted-foreground">Abra a mensagem da Empiria e clique no link de confirmação. Se não encontrar, confira a pasta de spam ou lixo eletrônico.</p>
        <Button asChild className="btn wide mt-8"><Link to="/auth">Ir para entrar</Link></Button>
        <Link to="/cursos" className="auth-back"><ArrowLeft size={16} aria-hidden="true" />Voltar aos cursos</Link>
      </main>
    </SiteShell>
  );
}