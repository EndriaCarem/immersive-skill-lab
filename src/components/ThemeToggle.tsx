import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Light is the default; the choice is remembered in localStorage ("empiria-theme"). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("empiria-theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? "Ativar modo claro" : "Ativar modo noturno"} title={dark ? "Modo claro" : "Modo noturno"}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export const THEME_SCRIPT = `try{if(localStorage.getItem("empiria-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
