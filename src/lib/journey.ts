/** Pure helpers for site-journey attribution (browser-safe, no storage access). */
export const SECTIONS: { prefix: string; section: string }[] = [
  { prefix: "/conheca", section: "Campanha" },
  { prefix: "/cursos", section: "Cursos" },
  { prefix: "/programa/", section: "Página do curso" },
  { prefix: "/webinars", section: "Blog" },
  { prefix: "/sobre", section: "Quem somos" },
  { prefix: "/interesse", section: "Interesse" },
  { prefix: "/contato", section: "Contato" },
  { prefix: "/auth", section: "Entrar ou cadastrar" },
  { prefix: "/confirmar-cadastro", section: "Cadastro" },
  { prefix: "/checkout", section: "Checkout" },
  { prefix: "/compras", section: "Compras" },
  { prefix: "/meus-programas", section: "Meus programas" },
  { prefix: "/estagio/", section: "Atividades" },
  { prefix: "/minha-conta", section: "Minha conta" },
];
export function sectionOf(path: string): string {
  if (path === "/" || path === "") return "Início";
  return SECTIONS.find((s) => path.startsWith(s.prefix))?.section ?? "Outras";
}
/** Admin and auth-callback screens are never tracked. */
export const isTracked = (path: string) => !path.startsWith("/admin") && !path.startsWith("/api") && !path.startsWith("/reset-password");

const clean = (v: string | null | undefined, max = 80) => (v ?? "").trim().replace(/[^\w\-. /]/gu, "").slice(0, max);

/** First-touch source: utm_source → ref → external referrer host → "direto". */
export function firstTouch(url: URL, referrer: string, ownHost: string) {
  const p = url.searchParams;
  let refHost = "";
  try { refHost = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : ""; } catch { refHost = ""; }
  const external = refHost && refHost !== ownHost.replace(/^www\./, "") ? refHost : "";
  const source = clean(p.get("utm_source")) || clean(p.get("ref")) || external || "direto";
  return { source, medium: clean(p.get("utm_medium")), campaign: clean(p.get("utm_campaign")), landing: url.pathname.slice(0, 300), referrerHost: external };
}

/** Ordered funnel used by the admin page. */
export const FUNNEL = ["Visitou o site", "Viu cursos", "Entrou ou cadastrou", "Área do aluno", "Comprou"] as const;
export function funnelStage(sections: Set<string>, purchased: boolean): number {
  let stage = 0;
  if (["Cursos", "Página do curso", "Checkout"].some((s) => sections.has(s))) stage = 1;
  if (["Entrar ou cadastrar", "Cadastro"].some((s) => sections.has(s))) stage = Math.max(stage, 2);
  if (["Meus programas", "Atividades", "Minha conta", "Compras"].some((s) => sections.has(s))) stage = Math.max(stage, 3);
  if (purchased) stage = 4;
  return stage;
}
