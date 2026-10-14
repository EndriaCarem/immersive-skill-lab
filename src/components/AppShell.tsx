import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import logoLight from "@/assets/empiria-logo-light.png.asset.json";

export function AppShell({ children }: { children: ReactNode }) {
  const student = useStore((s) => s.student);
  const initials = student
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="stage">
      <div className="window">
        <header className="appbar">
          <Link to="/" className="brand">
            <img src={logoLight.url} alt="Empiria" />
          </Link>
          <nav className="appnav">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "on" }}>
              Catálogo
            </Link>
            <Link to="/sobre" activeProps={{ className: "on" }}>
              Sobre
            </Link>
            <Link to="/meus-programas" activeProps={{ className: "on" }}>
              Meus programas
            </Link>
            <Link to="/admin" activeProps={{ className: "on" }}>
              Administração
            </Link>
          </nav>
          <div className="avatar" title={student}>
            {initials}
          </div>
        </header>
        {children}
        <footer className="foot">
          <span>
            <b>Empiria</b> · Não é um curso sobre arbitragem; é o que você redige quando o caso chega.
          </span>
          <span style={{ marginLeft: "auto" }}>
            Parceiros institucionais: <b>Arbipédia</b> · <b>CJA/CBMA</b>
          </span>
        </footer>
      </div>
    </div>
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
