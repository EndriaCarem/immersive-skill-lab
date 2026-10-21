import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAccount } from "@/lib/account";
import { Button } from "@/components/ui/button";
import logoDark from "@/assets/empiria-logo.png.asset.json";
import logoLight from "@/assets/empiria-logo-light.png.asset.json";

function TopNav() {
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const item = { activeProps: { className: "on" } };
  return (
    <div className="topnav">
      <div className="in">
        <Link to="/" className="logo" aria-label="Empiria — início">
          <img src={logoDark.url} alt="Empiria" />
        </Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link to="/" activeOptions={{ exact: true }} {...item}>
            Início
          </Link>
          <Link to="/cursos" {...item}>
            Cursos
          </Link>
          <Link to="/webinars" {...item}>
            Webinars
          </Link>
          <Link to="/sobre" {...item}>
            Quem somos
          </Link>
          <Link to="/contato" {...item}>
            Contato
          </Link>
          <Link to={user ? "/minha-conta" : "/auth"} {...item}>
            {user ? "Minha conta" : "Entrar"}
          </Link>
        </nav>
        <div className="right">
          <Link to="/cursos" className="iconbtn" aria-label="Buscar cursos">
            <Search size={18} />
          </Link>
          <Link to="/programa/$slug" params={{ slug: "arbitragem-nivel-1" }} className="btn sm nav-cta">
            Receber a primeira demanda
          </Link>
          <Button ref={toggleRef} variant="ghost" size="icon" className="iconbtn mobile-toggle" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((v) => !v)}>{open ? <X size={20} /> : <Menu size={20} />}</Button>
        </div>
      </div>
      {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Navegação no celular">
        <Link to="/" activeOptions={{ exact: true }} {...item}>Início</Link>
        <Link to="/cursos" {...item}>Cursos</Link>
        <Link to="/webinars" {...item}>Webinars</Link>
        <Link to="/sobre" {...item}>Quem somos</Link>
        <Link to="/contato" {...item}>Contato</Link>
        <Link to={user ? "/minha-conta" : "/auth"} {...item}>{user ? "Minha conta" : "Entrar"}</Link>
        <Link to="/interesse" search={{ curso: "" }} {...item}>Registrar interesse</Link>
      </nav>}
    </div>
  );
}

function SiteFooter() {
  const { isAdmin } = useAccount();
  return (
    <footer className="sitefoot">
      <div className="wrap footer-grid">
        <div>
          <img src={logoLight.url} alt="Empiria" style={{ height: 30, marginBottom: 16 }} />
          <p style={{ color: "var(--on-plum)", maxWidth: 340, fontSize: 14 }}>
            Não é um curso sobre arbitragem; é o que você redige quando o caso chega.
          </p>
        </div>
        <div>
          <h5>Plataforma</h5>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <Link to="/cursos">Cursos</Link>
            <Link to="/meus-programas">Portal do Aluno</Link>
            <Link to="/webinars">Webinars</Link>
            {isAdmin && <Link to="/admin">Administração</Link>}
          </div>
        </div>
        <div>
          <h5>Empiria</h5>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <Link to="/sobre">Sobre e método</Link>
            <Link to="/contato">Fale conosco</Link>
          </div>
        </div>
        <div>
          <h5>Parceiros</h5>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <span>Arbipédia</span>
            <span>CJA/CBMA</span>
          </div>
        </div>
      </div>
      <div className="wrap" style={{ marginTop: 36, fontSize: 12.5, color: "var(--lavender)" }}>
        © {new Date().getFullYear()} Empiria · Formação jurídica prática
      </div>
    </footer>
  );
}

/** Marketing pages: floating nav + full-width content + footer. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav />
      {children}
      <SiteFooter />
    </>
  );
}

/** App screens (activity flow, portal, admin): same nav, content in a rounded frame. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <div className="apppage">
        <div className="frame">{children}</div>
      </div>
    </SiteShell>
  );
}

export function Steps({ current, done }: { current: 1 | 2 | 3 | 4; done: number }) {
  return (
    <div className="steps" aria-label="Etapas da atividade">
      {[1, 2, 3, 4].map((n, i) => (
        <span key={n} style={{ display: "contents" }}>
          {i > 0 && <span className="sep">·</span>}
          <span className={n === current ? "on" : n <= done ? "done" : ""}>{n}</span>
        </span>
      ))}
    </div>
  );
}
