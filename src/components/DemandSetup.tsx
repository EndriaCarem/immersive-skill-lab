import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RichEditor } from "@/components/RichEditor";
import { supabase } from "@/integrations/supabase/client";
import { fmtSize } from "@/lib/files";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_EXTENSIONS,
  formatDuration,
  materialError,
  mediaPath,
  posterError,
  videoError,
  type MaterialCategory,
} from "@/lib/activity-room";
import type { Database } from "@/integrations/supabase/types";

type Staff = Database["public"]["Tables"]["learning_activity_staff"]["Row"];
type Material = Database["public"]["Tables"]["learning_activity_materials"]["Row"];
const BUCKET = "activity-media";

export type DemandTarget = {
  programId: string;
  activityId: string;
  title: string;
  index: number;
  contentFrom: string;
  contentSubject: string;
  supervisorName: string | null;
};

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (d: number | null) => { URL.revokeObjectURL(url); resolve(d); };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) && v.duration > 0 ? Math.round(v.duration) : null);
    v.onerror = () => done(null);
    v.src = url;
  });
}
function parseDuration(s: string): number | null | "bad" {
  const t = s.trim();
  if (!t) return null;
  const parts = t.split(":").map((x) => Number(x));
  if (parts.some((n) => !Number.isInteger(n) || n < 0) || parts.length > 3) return "bad";
  const sec = parts.reduce((acc, n) => acc * 60 + n, 0);
  return sec >= 1 && sec <= 14400 ? sec : "bad";
}

/** Admin dialog: the demand presentation (video, cover, description, duration), the simulated e-mail and the support library. */
export function DemandSetup({ target, row, onClose, onSaved }: { target: DemandTarget; row: Staff | undefined; onClose: () => void; onSaved: () => void }) {
  const [videoUrl, setVideoUrl] = useState(row?.demand_video_url ?? "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dropVideo, setDropVideo] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [dropPoster, setDropPoster] = useState(false);
  const [description, setDescription] = useState(row?.video_description ?? "");
  const [duration, setDuration] = useState(formatDuration(row?.video_duration_seconds) ?? "");
  const [subject, setSubject] = useState(row?.mail_subject ?? "");
  const [html, setHtml] = useState(row?.mail_html ?? "");
  const [busy, setBusy] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const hasStoredVideo = Boolean(row?.video_path) && !dropVideo;
  const hasStoredPoster = Boolean(row?.video_poster_path) && !dropPoster;

  async function pickVideo(f: File | undefined) {
    if (!f) return;
    const err = videoError(f);
    if (err) { toast.error(err); return; }
    setVideoFile(f);
    setDropVideo(false);
    const d = await readDuration(f);
    if (d) setDuration(formatDuration(d) ?? "");
  }

  async function save() {
    const url = videoUrl.trim();
    if (url && !/^https:\/\//.test(url)) { toast.error("O link do vídeo precisa começar com https://"); return; }
    const secs = parseDuration(duration);
    if (secs === "bad") { toast.error("Duração inválida. Use minutos:segundos, por exemplo 4:30."); return; }
    setBusy(true);
    const uploaded: string[] = [];
    try {
      let video_path = dropVideo ? null : row?.video_path ?? null;
      let video_poster_path = dropPoster ? null : row?.video_poster_path ?? null;
      if (videoFile) {
        const p = mediaPath(target.programId, target.activityId, videoFile.name);
        const up = await supabase.storage.from(BUCKET).upload(p, videoFile, { contentType: videoFile.type || undefined, upsert: false });
        if (up.error) throw new Error("Não foi possível enviar o vídeo.");
        uploaded.push(p);
        video_path = p;
      }
      if (posterFile) {
        const p = mediaPath(target.programId, target.activityId, posterFile.name);
        const up = await supabase.storage.from(BUCKET).upload(p, posterFile, { contentType: posterFile.type || undefined, upsert: false });
        if (up.error) throw new Error("Não foi possível enviar a capa.");
        uploaded.push(p);
        video_poster_path = p;
      }
      const hasVideo = Boolean(video_path || url);
      const { error } = await supabase.from("learning_activity_staff").upsert({
        program_id: target.programId,
        activity_id: target.activityId,
        demand_video_url: url,
        video_path,
        video_poster_path,
        video_description: description.trim(),
        video_duration_seconds: hasVideo ? secs : null,
        mail_subject: subject.trim(),
        mail_html: html.trim(),
      });
      if (error) throw new Error("Não foi possível salvar a demanda.");
      const stale = [row?.video_path, row?.video_poster_path].filter((p): p is string => Boolean(p) && p !== video_path && p !== video_poster_path);
      if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
      toast.success("Demanda da atividade salva.");
      onSaved();
      onClose();
    } catch (e) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wb-modal" role="dialog" aria-modal="true" aria-label={`Demanda da atividade ${target.index + 1}`}>
      <div className="wb-modal-in">
        <h3 style={{ margin: 0 }}>
          Atividade {target.index + 1} · {target.title}
        </h3>
        <p className="muted sm" style={{ margin: 0 }}>
          Remetente do e-mail: <b>{target.supervisorName ?? target.contentFrom}</b>
          {target.supervisorName ? " (supervisor da atividade)" : " (texto do curso — defina um supervisor para vinculá-lo)"}
        </p>

        <h4 style={{ margin: "8px 0 0" }}>Vídeo de apresentação</h4>
        <div className="prof-photo" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Button type="button" variant="outline" size="sm" onClick={() => videoInput.current?.click()}>
              {videoFile || hasStoredVideo ? "Substituir arquivo de vídeo" : "Enviar arquivo de vídeo"}
            </Button>
            {(videoFile || hasStoredVideo) && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setVideoFile(null); setDropVideo(true); }}>
                Remover arquivo
              </Button>
            )}
            <span className="muted sm">
              {videoFile ? `${videoFile.name} · ${fmtSize(videoFile.size)}` : hasStoredVideo ? "Arquivo publicado" : "MP4, WEBM ou MOV · até 200 MB · privado aos matriculados"}
            </span>
          </div>
          <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime,.m4v" hidden aria-label="Arquivo de vídeo" onChange={(e) => { pickVideo(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <label>
          Ou link do vídeo (YouTube, Vimeo ou https)
          <input value={videoUrl} maxLength={500} placeholder="Sem link" onChange={(e) => setVideoUrl(e.target.value)} />
        </label>
        <span className="muted sm">Quando houver arquivo enviado, ele tem prioridade sobre o link.</span>
        <div className="wb-2col">
          <label>
            Duração real (min:seg)
            <input value={duration} maxLength={8} placeholder="Preenchida ao enviar o arquivo" onChange={(e) => setDuration(e.target.value)} />
          </label>
          <div className="wb-lbl">
            Capa do vídeo
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Button type="button" variant="outline" size="sm" onClick={() => posterInput.current?.click()}>
                {posterFile || hasStoredPoster ? "Substituir capa" : "Enviar capa"}
              </Button>
              {(posterFile || hasStoredPoster) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setPosterFile(null); setDropPoster(true); }}>
                  Remover
                </Button>
              )}
              <span className="muted sm" style={{ fontWeight: 400 }}>{posterFile ? posterFile.name : hasStoredPoster ? "Capa publicada" : "Opcional · JPG, PNG ou WEBP · 2 MB"}</span>
            </div>
            <input ref={posterInput} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Capa do vídeo" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const err = posterError(f); if (err) { toast.error(err); return; } setPosterFile(f); setDropPoster(false); }} />
          </div>
        </div>
        <label>
          Descrição acessível do vídeo
          <textarea rows={2} maxLength={1000} value={description} placeholder="Ex.: a supervisora apresenta a demanda e o prazo do parecer." onChange={(e) => setDescription(e.target.value)} />
        </label>

        <h4 style={{ margin: "8px 0 0" }}>E-mail da demanda</h4>
        <label>
          Assunto
          <input value={subject} maxLength={200} placeholder={target.contentSubject || "Assunto do e-mail"} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <div className="wb-lbl">
          Mensagem (vazio = texto do curso)
          <RichEditor value={html} onChange={setHtml} placeholder="Escreva como o supervisor escreveria ao estagiário…" />
        </div>
        <span className="muted sm">Este e-mail é simulado na sala; nada é enviado de verdade. Evite instruções que entreguem a solução.</span>

        <MaterialsEditor target={target} />

        <div className="wb-modal-actions">
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose} disabled={busy}>Fechar</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar demanda"}</Button>
        </div>
      </div>
    </div>
  );
}

/** Support library for the activity. Saved immediately per item; answer keys belong to the answer-key editor, never here. */
function MaterialsEditor({ target }: { target: DemandTarget }) {
  const [items, setItems] = useState<Material[] | null>(null);
  const [category, setCategory] = useState<MaterialCategory>("case");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const load = async () => {
    const { data, error } = await supabase.from("learning_activity_materials").select("*").eq("program_id", target.programId).eq("activity_id", target.activityId).order("position").order("created_at");
    if (error) { toast.error("Não foi possível carregar os materiais."); setItems([]); return; }
    setItems(data ?? []);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [target.programId, target.activityId]);

  async function add(f: File | undefined) {
    if (!f) return;
    const err = materialError(f);
    if (err) { toast.error(err); return; }
    setBusy(true);
    const p = mediaPath(target.programId, target.activityId, f.name);
    const up = await supabase.storage.from(BUCKET).upload(p, f, { contentType: f.type || undefined, upsert: false });
    if (up.error) { setBusy(false); toast.error("Não foi possível enviar o material."); return; }
    const { error } = await supabase.from("learning_activity_materials").insert({
      program_id: target.programId, activity_id: target.activityId, title: f.name.replace(/\.[^.]+$/, "").slice(0, 200) || f.name,
      category, file_path: p, file_name: f.name, file_size: f.size, position: items?.length ?? 0,
    });
    if (error) { await supabase.storage.from(BUCKET).remove([p]); toast.error("Não foi possível registrar o material."); }
    else toast.success("Material anexado.");
    setBusy(false);
    load();
  }
  async function update(m: Material, patch: Partial<Material>) {
    const { error } = await supabase.from("learning_activity_materials").update(patch).eq("id", m.id);
    if (error) { toast.error("Não foi possível salvar o material."); return; }
    toast.success("Material atualizado.");
    load();
  }
  async function remove(m: Material) {
    if (!confirm(`Remover "${m.title}" dos materiais?`)) return;
    const { error } = await supabase.from("learning_activity_materials").delete().eq("id", m.id);
    if (error) { toast.error("Não foi possível remover."); return; }
    await supabase.storage.from(BUCKET).remove([m.file_path]);
    load();
  }

  return (
    <section style={{ display: "grid", gap: 10 }}>
      <h4 style={{ margin: "8px 0 0" }}>Materiais antes da entrega</h4>
      <span className="muted sm">Documentos do caso, anexos e modelos de preenchimento. Gabaritos e respostas de referência ficam no editor do gabarito e só abrem depois da entrega.</span>
      {items === null ? <span className="muted sm">Carregando…</span> : items.length === 0 ? <span className="muted sm">Nenhum material anexado.</span> : null}
      {items?.map((m) => <MaterialItem key={m.id} m={m} onSave={(patch) => update(m, patch)} onRemove={() => remove(m)} />)}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select className="wb-select" aria-label="Categoria do novo material" value={category} onChange={(e) => setCategory(e.target.value as MaterialCategory)}>
          {(Object.keys(MATERIAL_CATEGORIES) as MaterialCategory[]).map((c) => <option key={c} value={c}>{MATERIAL_CATEGORIES[c]}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Enviando…" : "+ Anexar material"}</Button>
        <span className="muted sm">{MATERIAL_EXTENSIONS.join(", ").toUpperCase()} · até 25 MB</span>
        <input ref={input} type="file" hidden aria-label="Arquivo do material" accept={MATERIAL_EXTENSIONS.map((e) => `.${e}`).join(",")} onChange={(e) => { add(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </section>
  );
}

function MaterialItem({ m, onSave, onRemove }: { m: Material; onSave: (p: Partial<Material>) => void; onRemove: () => void }) {
  const [f, setF] = useState({ title: m.title, doc_type: m.doc_type, description: m.description, category: m.category, version: m.version });
  const dirty = f.title !== m.title || f.doc_type !== m.doc_type || f.description !== m.description || f.category !== m.category || f.version !== m.version;
  return (
    <div className="prof-item" style={{ display: "grid", gap: 8 }}>
      <span className="muted sm">{m.file_name} · {fmtSize(m.file_size)}</span>
      <div className="wb-2col">
        <label>Nome<input value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label>Tipo de documento<input value={f.doc_type} maxLength={60} placeholder="Ex.: Contrato, Notificação" onChange={(e) => setF({ ...f, doc_type: e.target.value })} /></label>
      </div>
      <div className="wb-2col">
        <label>
          Categoria
          <select className="wb-select" style={{ width: "100%" }} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {(Object.keys(MATERIAL_CATEGORIES) as MaterialCategory[]).map((c) => <option key={c} value={c}>{MATERIAL_CATEGORIES[c]}</option>)}
          </select>
        </label>
        <label>Versão (opcional)<input value={f.version} maxLength={40} onChange={(e) => setF({ ...f, version: e.target.value })} /></label>
      </div>
      <label>Descrição (opcional)<textarea rows={2} maxLength={600} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="button" size="sm" disabled={!dirty || !f.title.trim()} onClick={() => onSave({ ...f, title: f.title.trim() })}>Salvar material</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>Remover</Button>
      </div>
    </div>
  );
}
