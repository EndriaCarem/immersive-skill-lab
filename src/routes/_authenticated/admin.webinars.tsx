import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RichEditor } from "@/components/RichEditor";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminGuard } from "@/lib/admin-guard";
import { commerceHead } from "@/lib/commerce-schema";
import { cleanTag, dateBR, shareLink, slugify } from "@/lib/webinar-utils";
import type { Database } from "@/integrations/supabase/types";

type Webinar = Database["public"]["Tables"]["webinars"]["Row"];
type Visit = Database["public"]["Tables"]["webinar_visits"]["Row"];

const opts = () =>
  queryOptions({
    queryKey: ["admin-webinars"],
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const [w, v] = await Promise.all([
        supabase.from("webinars").select("*").order("created_at", { ascending: false }),
        supabase.from("webinar_visits").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
      ]);
      if (w.error || v.error) throw new Error("Não foi possível carregar os webinars.");
      return { webinars: w.data as Webinar[], visits: v.data as Visit[] };
    },
  });

export const Route = createFileRoute("/_authenticated/admin/webinars")({
  beforeLoad: adminGuard,
  head: () => commerceHead("Webinars", "Publique webinars, gere links rastreados e acompanhe os acessos."),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts()),
  component: AdminWebinars,
});

const empty = { id: "", slug: "", title: "", summary: "", body_html: "", speaker: "", video_url: "", cover_url: "", starts_at: "", status: "draft" };
type Form = typeof empty;

function countBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function AdminWebinars() {
  const { data } = useSuspenseQuery(opts());
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<string>("all");
  const [link, setLink] = useState({ ref: "", source: "", campaign: "" });

  const visits = focus === "all" ? data.visits : data.visits.filter((v) => v.webinar_id === focus);
  const unique = new Set(visits.map((v) => v.visitor_id)).size;
  const tagged = visits.filter((v) => v.ref || v.utm_source).length;
  const byRef = countBy(visits, (v) => v.ref || v.utm_source || "(direto)");
  const byWebinar = countBy(data.visits, (v) => v.webinar_id);
  const days = useMemo(() => {
    const out: [string, number][] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      out.push([d, visits.filter((v) => v.created_at.slice(0, 10) === d).length]);
    }
    return out;
  }, [visits]);
  const max = Math.max(1, ...days.map((d) => d[1]));
  const title = (id: string) => data.webinars.find((w) => w.id === id)?.title ?? "—";

  async function save() {
    if (!form) return;
    if (!form.title.trim()) return toast.error("Informe o título.");
    const slug = slugify(form.slug || form.title);
    if (!slug) return toast.error("Endereço inválido.");
    setBusy(true);
    const row = {
      slug, title: form.title.trim().slice(0, 200), summary: form.summary.slice(0, 400), body_html: form.body_html,
      speaker: form.speaker.slice(0, 120), video_url: form.video_url.trim(), cover_url: form.cover_url.trim(),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null, status: form.status, updated_at: new Date().toISOString(),
    };
    const res = form.id ? await supabase.from("webinars").update(row).eq("id", form.id) : await supabase.from("webinars").insert(row);
    setBusy(false);
    if (res.error) return toast.error(res.error.code === "23505" ? "Já existe um webinar com esse endereço." : "Não foi possível salvar.");
    toast.success(form.status === "published" ? "Webinar publicado." : "Rascunho salvo.");
    setForm(null);
    qc.invalidateQueries({ queryKey: ["admin-webinars"] });
    qc.invalidateQueries({ queryKey: ["webinars"] });
  }
  async function remove(w: Webinar) {
    if (!confirm(`Excluir "${w.title}"? Os acessos registrados também serão apagados.`)) return;
    const { error } = await supabase.from("webinars").delete().eq("id", w.id);
    if (error) return toast.error("Não foi possível excluir.");
    toast.success("Webinar excluído.");
    qc.invalidateQueries({ queryKey: ["admin-webinars"] });
  }
  const focused = data.webinars.find((w) => w.id === focus);
  const generated = focused && typeof window !== "undefined" ? shareLink(window.location.origin, focused.slug, link.ref, link.source, link.campaign) : "";

  return (
    <AppShell>
      <main className="pane">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div><div className="eyebrow">Administração</div><h2 style={{ margin: 0 }}>Webinars</h2></div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/admin" className="btn ghost">← Painel</Link>
            <Button onClick={() => setForm({ ...empty })}>+ Novo webinar</Button>
          </div>
        </div>

        <h4>Insights · últimos 90 dias</h4>
        <div style={{ marginBottom: 12 }}>
          <select className="wb-select" value={focus} onChange={(e) => setFocus(e.target.value)} aria-label="Filtrar webinar">
            <option value="all">Todos os webinars</option>
            {data.webinars.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
        </div>
        <div className="wb-kpis">
          <div><b>{visits.length}</b><span>Acessos</span></div>
          <div><b>{unique}</b><span>Visitantes únicos</span></div>
          <div><b>{visits.length ? Math.round((tagged / visits.length) * 100) : 0}%</b><span>Via link rastreado</span></div>
          <div><b>{byRef.filter(([k]) => k !== "(direto)").length}</b><span>Origens diferentes</span></div>
        </div>
        <div className="wb-panels">
          <div className="wb-panel">
            <div className="wb-ptitle">Acessos por dia (14 dias)</div>
            <div className="wb-bars">{days.map(([d, n]) => <div key={d} title={`${d}: ${n}`}><i style={{ height: `${(n / max) * 100}%` }} /><span>{d.slice(8)}</span></div>)}</div>
          </div>
          <div className="wb-panel">
            <div className="wb-ptitle">Quem está entrando (por tag)</div>
            {byRef.length === 0 ? <p className="muted sm">Sem acessos ainda.</p> : byRef.slice(0, 8).map(([k, n]) => (
              <div key={k} className="wb-row"><span>{k}</span><i style={{ width: `${(n / byRef[0]![1]) * 100}%` }} /><b>{n}</b></div>
            ))}
          </div>
          {focus === "all" && (
            <div className="wb-panel">
              <div className="wb-ptitle">Mais acessados</div>
              {byWebinar.length === 0 ? <p className="muted sm">Sem acessos ainda.</p> : byWebinar.slice(0, 6).map(([id, n]) => (
                <div key={id} className="wb-row"><span>{title(id)}</span><b>{n}</b></div>
              ))}
            </div>
          )}
        </div>

        {focused && (
          <div className="wb-panel" style={{ marginTop: 16 }}>
            <div className="wb-ptitle">Gerar link rastreado · {focused.title}</div>
            <div className="wb-linkform">
              <input placeholder="Tag (ex.: rebeca, parceiro-cbma)" value={link.ref} onChange={(e) => setLink({ ...link, ref: e.target.value })} />
              <input placeholder="Canal (ex.: instagram, whatsapp)" value={link.source} onChange={(e) => setLink({ ...link, source: e.target.value })} />
              <input placeholder="Campanha (opcional)" value={link.campaign} onChange={(e) => setLink({ ...link, campaign: e.target.value })} />
            </div>
            <div className="wb-linkout">
              <code>{generated}</code>
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(generated); toast.success("Link copiado."); }}>Copiar</Button>
            </div>
            {focused.status !== "published" && <p className="muted sm">Este webinar ainda é rascunho: o link só abre depois de publicado.</p>}
          </div>
        )}

        <h4>Webinars</h4>
        {data.webinars.length === 0 && <p className="muted">Nenhum webinar criado ainda.</p>}
        <div className="wb-admin-list">
          {data.webinars.map((w) => (
            <div key={w.id} className="wb-admin-item">
              <div>
                <span className={`wb-status ${w.status}`}>{w.status === "published" ? "Publicado" : "Rascunho"}</span>
                <b>{w.title}</b>
                <div className="muted sm">/webinars/{w.slug} · {dateBR(w.starts_at) || "sem data"} · {data.visits.filter((v) => v.webinar_id === w.id).length} acessos</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Button variant="outline" size="sm" onClick={() => setFocus(w.id)}>Insights e link</Button>
                {w.status === "published" && <Link to="/webinars/$slug" params={{ slug: w.slug }} className="btn ghost sm" target="_blank">Ver</Link>}
                <Button variant="outline" size="sm" onClick={() => setForm({ ...w, starts_at: w.starts_at ? w.starts_at.slice(0, 16) : "" })}>Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(w)}>Excluir</Button>
              </div>
            </div>
          ))}
        </div>

        {form && (
          <div className="wb-modal" role="dialog" aria-modal="true" aria-label="Editar webinar">
            <div className="wb-modal-in">
              <h3 style={{ marginTop: 0 }}>{form.id ? "Editar webinar" : "Novo webinar"}</h3>
              <label>Título<input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} /></label>
              <label>Endereço<input value={form.slug} maxLength={100} onChange={(e) => setForm({ ...form, slug: cleanTag(e.target.value) })} /></label>
              <label>Resumo<textarea rows={2} maxLength={400} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
              <div className="wb-2col">
                <label>Palestrante(s)<input value={form.speaker} maxLength={120} onChange={(e) => setForm({ ...form, speaker: e.target.value })} /></label>
                <label>Data e hora<input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
              </div>
              <label>Link do vídeo (YouTube ou Vimeo)<input value={form.video_url} placeholder="https://youtube.com/watch?v=…" onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></label>
              <label>Imagem de capa (link https)<input value={form.cover_url} placeholder="https://…" onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></label>
              <div className="wb-lbl">Texto do post</div>
              <RichEditor value={form.body_html} onChange={(h) => setForm((f) => (f ? { ...f, body_html: h } : f))} />
              <div className="wb-modal-actions">
                <select className="wb-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} aria-label="Status">
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
                <span style={{ flex: 1 }} />
                <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
                <Button disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar"}</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
