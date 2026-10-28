import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Menu, X, UserRound, Moon, Sun, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoDark from "@/assets/empiria-logo.png.asset.json";
import logoLight from "@/assets/empiria-logo-light.png.asset.json";
import footerLogoWhite from "@/assets/empiria-footer-white.png";

/** Theme follows the device (prefers-color-scheme) until the visitor picks one with the toggle. */
function useAccountTheme(_signedIn?: boolean) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem("empiria-theme"); } catch { /* ignore */ }
      const next = stored ? stored === "dark" : mq.matches;
      document.documentElement.classList.toggle("dark", next);
      setDark(next);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("empiria-theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };
  return { dark, toggle };
}

function TopNav() {
  const { user, isAdmin } = useAccount();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dark, toggle } = useAccountTheme(Boolean(user));
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const item = { activeProps: { className: "on" } };
  const links = (
    <>
      <Link to="/" activeOptions={{ exact: true }} {...item}>Início</Link>
      {user && <Link to="/meus-programas" {...item}>Meus programas</Link>}
      <Link to="/cursos" {...item}>Cursos</Link>
      <Link to="/webinars" {...item}>Webinars</Link>
      <Link to="/sobre" {...item}>Quem somos</Link>
      {!user && <Link to="/contato" {...item}>Contato</Link>}
    </>
  );
  return (
    <header className={`topnav${scrolled ? " scrolled" : ""}`}>
      <div className="in">
        <Link to="/" className="logo" aria-label="Empiria — Ir para o início">
          <img src={footerLogoWhite} alt="Empiria" />
        </Link>
        <nav className="desktop-nav" aria-label="Navegação principal">{links}</nav>
        <div className="right">
          <button type="button" className="theme-btn" onClick={toggle} aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"} title={dark ? "Modo claro" : "Modo escuro"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="profile-btn" aria-label="Abrir menu do perfil"><UserRound size={18} /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/minha-conta">Configurações da conta</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/compras">Minhas compras</Link></DropdownMenuItem>
                {isAdmin && <DropdownMenuItem asChild><Link to="/admin">Administração</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggle(); }}>
                  {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? "Modo claro" : "Modo noturno"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void signOut()}><LogOut size={16} /> Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth" className="nav-login">Entrar</Link>
              <Link to="/programa/$slug" params={{ slug: "arbitragem-nivel-1" }} className="btn sm nav-cta">Receber a primeira demanda</Link>
            </>
          )}
          <Button ref={toggleRef} variant="ghost" size="icon" className="iconbtn mobile-toggle" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((v) => !v)}>{open ? <X size={20} /> : <Menu size={20} />}</Button>
        </div>
      </div>
      {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Navegação no celular">
        {links}
        {user ? (
          <>
            <Link to="/minha-conta" {...item}>Configurações da conta</Link>
            <Link to="/compras" {...item}>Minhas compras</Link>
            {isAdmin && <Link to="/admin" {...item}>Administração</Link>}
            <button type="button" onClick={toggle}>{dark ? "Modo claro" : "Modo noturno"}</button>
            <button type="button" onClick={() => void signOut()}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/auth" {...item}>Entrar</Link>
            <Link to="/programa/$slug" params={{ slug: "arbitragem-nivel-1" }} className="btn">Receber a primeira demanda</Link>
          </>
        )}
      </nav>}
    </header>
  );
}

function MinimalFooter() {
  return (
    <footer className="sitefoot mfoot">
      <div className="wrap mfoot-top">
        <div className="mfoot-brand">
          <img src={footerLogoWhite} alt="Empiria" />
          <p className="doc-voice">Empiria: o conhecimento que vem da experiência.</p>
        </div>
        <nav className="mfoot-contact" aria-label="Contatos da Empiria">
          <a href="https://www.instagram.com/empiria.law/" target="_blank" rel="noopener noreferrer">
            Instagram @empiria.law
          </a>
          <a href="mailto:atendimento@empiria-law.com">atendimento@empiria-law.com</a>
          <a href="https://empiria-law.com">empiria-law.com</a>
        </nav>
      </div>
      <div className="wrap mfoot-bottom">
        <span>© {new Date().getFullYear()} Empiria. Os casos, a banca e os nomes nas telas são fictícios.</span>
        <nav aria-label="Documentos legais">
          <Link to="/termos">Termos de uso e matrícula</Link>
          <Link to="/privacidade">Privacidade e LGPD</Link>
        </nav>
      </div>
    </footer>
  );
}

function SiteFooter({ campaign = false }: { campaign?: boolean }) {
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
        {!campaign && <div>
          <h5>Plataforma</h5>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <Link to="/cursos">Cursos</Link>
            <Link to="/meus-programas">Portal do Aluno</Link>
            {isAdmin && <Link to="/admin">Administração</Link>}
          </div>
        </div>}
        <div>
          {campaign ? <>
            <h5>Siga a Empiria</h5>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <a href="https://www.instagram.com/empiria.law/" target="_blank" rel="noopener noreferrer">Instagram @empiria.law</a>
            </div>
          </> : <>
            <h5>Empiria</h5>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <Link to="/sobre">Sobre e método</Link>
              <Link to="/contato">Fale conosco</Link>
            </div>
          </>}
          <h5 style={{ marginTop: 18 }}>Legal</h5>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <Link to="/termos">Termos de uso e matrícula</Link>
            <Link to="/privacidade">Privacidade e LGPD</Link>
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
        © {new Date().getFullYear()} Empiria · Formação jurídica prática · <Link to="/privacidade" style={{ color: "inherit" }}>Seus dados e a LGPD</Link>
      </div>
    </footer>
  );
}

/** Marketing pages: floating nav + full-width content + footer. */
export function SiteShell({ children, minimalFooter = false, hideNav = false }: { children: ReactNode; minimalFooter?: boolean; hideNav?: boolean }) {
  return (
    <>
      {!hideNav && <TopNav />}
      {children}
      {minimalFooter ? <MinimalFooter /> : <SiteFooter campaign={hideNav} />}
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
