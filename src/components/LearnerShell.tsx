import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, ShoppingBag, UserRound, ArrowUpRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAccount } from "@/lib/account";

/** Presentation only: account identity, enrollment and activity gates stay with their existing callers. */
export function LearnerShell({ children, sidebar }: { children: ReactNode; sidebar?: ReactNode }) {
  const { isAdmin } = useAccount();
  return <AppShell className="learner-shell">
    <div className="learner-workspace">
      <aside className="learner-sidebar">
        <div className="learner-sidebar-label">Seu espaço de aprendizado</div>
        <nav className="learner-nav" aria-label="Navegação do aluno">
          <Link to="/meus-programas" activeProps={{ className: "on" }}><BookOpen size={18} /> Meus programas</Link>
          <Link to="/compras" activeProps={{ className: "on" }}><ShoppingBag size={18} /> Minhas compras</Link>
          <Link to="/minha-conta" activeProps={{ className: "on" }}><UserRound size={18} /> Minha conta</Link>
        </nav>
        {isAdmin && <Link className="learner-admin-link" to="/admin"><ShieldCheck size={18} /> Painel administrativo</Link>}
        {sidebar && <div className="learner-course-nav">{sidebar}</div>}
        <Link className="learner-catalog-link" to="/cursos">Explorar cursos <ArrowUpRight size={16} /></Link>
      </aside>
      <div className="learner-content">{children}</div>
    </div>
  </AppShell>;
}