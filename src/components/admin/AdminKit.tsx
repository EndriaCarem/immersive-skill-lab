import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpen, LayoutDashboard, Newspaper, ShoppingBag, Users } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/comercial", label: "Operação comercial", icon: ShoppingBag },
  { to: "/admin/webinars", label: "Blogs", icon: Newspaper },
  { to: "/admin/professores", label: "Professores", icon: Users },
  { to: "/admin/atividades", label: "Conteúdo das atividades", icon: BookOpen },
] as const;

/** Shared admin header: title, description, section navigation and page actions. */
export function AdminHeader({ title, text, actions }: { title: string; text?: string; actions?: ReactNode }) {
  return (
    <header className="adm-head">
      <nav className="adm-nav" aria-label="Seções da administração">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/admin" }} activeProps={{ className: "on" }}>
            <Icon size={16} aria-hidden />{label}
          </Link>
        ))}
      </nav>
      <div className="adm-title">
        <div>
          <div className="adm-eyebrow">Administração</div>
          <h1>{title}</h1>
          {text && <p>{text}</p>}
        </div>
        {actions && <div className="adm-actions">{actions}</div>}
      </div>
    </header>
  );
}

export function Kpi({ label, value, hint, onClick, alert }: { label: string; value: ReactNode; hint?: string; onClick?: () => void; alert?: boolean }) {
  const body = <><small>{label}</small><b>{value}</b>{hint && <span>{hint}</span>}</>;
  return onClick
    ? <button type="button" className={`adm-kpi${alert ? " alert" : ""}`} onClick={onClick}>{body}</button>
    : <div className={`adm-kpi${alert ? " alert" : ""}`}>{body}</div>;
}
export const KpiRow = ({ children }: { children: ReactNode }) => <div className="adm-kpis">{children}</div>;

export function ChartCard({ title, hint, children, wide }: { title: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`adm-chart${wide ? " wide" : ""}`}>
      <div className="adm-chart-hd"><h3>{title}</h3>{hint && <span>{hint}</span>}</div>
      {children}
    </section>
  );
}
export const ChartGrid = ({ children }: { children: ReactNode }) => <div className="adm-charts">{children}</div>;

export type Point = { name: string; value: number };
const PALETTE = ["var(--plum)", "var(--plum-mid)", "oklch(0.7 0.09 315)", "oklch(0.82 0.06 315)", "oklch(0.55 0.05 260)", "oklch(0.72 0.12 155)"];
const tip = { contentStyle: { background: "var(--paper)", border: "1px solid var(--edge)", borderRadius: 8, fontSize: 12, color: "var(--ink)" }, cursor: { fill: "color-mix(in oklch, var(--plum) 8%, transparent)" } };
const axis = { tick: { fontSize: 11, fill: "var(--slate)" }, axisLine: false, tickLine: false } as const;
const Empty = () => <p className="adm-empty">Ainda sem dados para mostrar.</p>;
const hasData = (d: Point[]) => d.some(p => p.value > 0);

export function TrendChart({ data, format }: { data: Point[]; format?: (n: number) => string }) {
  if (!hasData(data)) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs><linearGradient id="admArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--plum-mid)" stopOpacity={0.45} /><stop offset="100%" stopColor="var(--plum-mid)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="var(--edge)" />
        <XAxis dataKey="name" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} allowDecimals={false} {...(format ? { tickFormatter: format } : {})} />
        <Tooltip {...tip} formatter={(v: number) => [format ? format(v) : v, ""]} separator="" />
        <Area type="monotone" dataKey="value" stroke="var(--plum)" strokeWidth={2} fill="url(#admArea)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HBarChart({ data, format }: { data: Point[]; format?: (n: number) => string }) {
  if (!hasData(data)) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={150} {...axis} tickFormatter={(s: string) => (s.length > 22 ? s.slice(0, 21) + "…" : s)} />
        <Tooltip {...tip} formatter={(v: number) => [format ? format(v) : v, ""]} separator="" />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>{data.map((_, i) => <Cell key={i} fill={PALETTE[i % 2]} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: Point[] }) {
  const rows = data.filter(d => d.value > 0);
  if (!rows.length) return <Empty />;
  const total = rows.reduce((s, d) => s + d.value, 0);
  return (
    <div className="adm-donut">
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2} stroke="none">
            {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip {...tip} />
        </PieChart>
      </ResponsiveContainer>
      <ul>{rows.map((d, i) => <li key={d.name}><i style={{ background: PALETTE[i % PALETTE.length] }} />{d.name}<b>{d.value}</b><em>{Math.round((d.value / total) * 100)}%</em></li>)}</ul>
    </div>
  );
}

/** Daily counts for the last `days` days, labelled dd/mm. */
export function dailySeries<T>(rows: T[], date: (r: T) => string | null | undefined, days = 30, weight: (r: T) => number = () => 1): Point[] {
  const out: Point[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    out.push({ name: `${d.slice(8)}/${d.slice(5, 7)}`, value: rows.filter(r => date(r)?.slice(0, 10) === d).reduce((s, r) => s + weight(r), 0) });
  }
  return out;
}
export function countPoints<T>(rows: T[], key: (r: T) => string): Point[] {
  const m = new Map<string, number>();
  rows.forEach(r => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
