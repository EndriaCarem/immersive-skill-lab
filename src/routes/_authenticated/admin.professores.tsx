import { AdminHeader, ChartCard, ChartGrid, DonutChart, HBarChart, Kpi, KpiRow, TrendChart, countPoints, dailySeries } from "@/components/admin/AdminKit";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Portrait } from "@/components/FacultyMedia";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminGuard } from "@/lib/admin-guard";
import { commerceHead } from "@/lib/commerce-schema";
import { PHOTO_TYPES, photoError } from "@/lib/professionals";
import { DemandSetup, type DemandTarget } from "@/components/DemandSetup";
import type { Database } from "@/integrations/supabase/types";

type Person = Database["public"]["Tables"]["learning_professionals"]["Row"];
type Link_ = Database["public"]["Tables"]["learning_course_professionals"]["Row"];
type Staff = Database["public"]["Tables"]["learning_activity_staff"]["Row"];
type Course = { id: string; title: string; activities: { id: string; title: string; demandFrom: string; demandSubject: string }[] };

const BUCKET = "professional-photos";

async function loadAdmin() {
      const [people, links, staff, programs] = await Promise.all([
        supabase.from("learning_professionals").select("*").order("full_name"),
        supabase.from("learning_course_professionals").select("*"),
        supabase.from("learning_activity_staff").select("*"),
        supabase.from("learning_programs").select("id, content"),
      ]);
      if (people.error || links.error || staff.error || programs.error) throw new Error("Não foi possível carregar os professores.");
      const paths = (people.data ?? []).map((p) => p.photo_path).filter((p): p is string => Boolean(p));
      const urls: Record<string, string> = {};
      if (paths.length) {
        const signed = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
        for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
      }
      const courses: Course[] = (programs.data ?? [])
        .map((p) => {
          const c = p.content as { title?: string; activities?: { id: string; title: string; demandFrom?: string; demandSubject?: string }[] };
          return { id: p.id, title: c.title ?? p.id, activities: (c.activities ?? []).map((a) => ({ id: a.id, title: a.title, demandFrom: a.demandFrom ?? "", demandSubject: a.demandSubject ?? "" })) };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
      return { people: people.data as Person[], links: links.data as Link_[], staff: staff.data as Staff[], courses, urls };
}
const opts = () => queryOptions({ queryKey: ["admin-professionals"], queryFn: loadAdmin });

export const Route = createFileRoute("/_authenticated/admin/professores")({
  beforeLoad: adminGuard,
  head: () => commerceHead("Professores", "Cadastre profissionais e vincule-os aos cursos e às atividades."),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts()),
  component: AdminProfessionals,
});

type Form = {
  id: string;
  full_name: string;
  title: string;
  specialty: string;
  bio: string;
  active: boolean;
  display_authorized: boolean;
  photo_path: string | null;
};
const empty: Form = { id: "", full_name: "", title: "", specialty: "", bio: "", active: true, display_authorized: false, photo_path: null };
type Tab = "pessoas" | "cursos" | "atividades";

function AdminProfessionals() {
  const { data } = useSuspenseQuery(opts());
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pessoas");
  const [form, setForm] = useState<Form | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-professionals"] });
  const person = (p: Person) => ({ id: p.id, fullName: p.full_name, title: p.title, specialty: p.specialty, bio: p.bio, photoUrl: p.photo_path ? (data.urls[p.photo_path] ?? null) : null });
  const coursesOf = (id: string) => data.links.filter((l) => l.professional_id === id).map((l) => data.courses.find((c) => c.id === l.program_id)?.title ?? l.program_id);

  return (
    <AppShell>
      <main className="pane adm-page">
        <AdminHeader title="Professores" text="Professores e profissionais dos cursos e das atividades." actions={<Button onClick={() => setForm({ ...empty })}>+ Novo profissional</Button>} />
        <KpiRow>
          <Kpi label="Cadastrados" value={data.people.length} />
          <Kpi label="Visíveis no site" value={data.people.filter((p) => p.active && p.display_authorized).length} hint="ativos e com exibição autorizada" />
          <Kpi label="Sem foto" value={data.people.filter((p) => !p.photo_path).length} alert={data.people.some((p) => !p.photo_path)} />
          <Kpi label="Vínculos com cursos" value={data.links.length} />
        </KpiRow>
        <ChartGrid>
          <ChartCard title="Professores por curso">
            <HBarChart data={countPoints(data.links, (l) => data.courses.find((c) => c.id === l.program_id)?.title ?? "Curso")} />
          </ChartCard>
          <ChartCard title="Situação dos cadastros">
            <DonutChart data={[{ name: "Visíveis", value: data.people.filter((p) => p.active && p.display_authorized).length }, { name: "Ativos sem autorização", value: data.people.filter((p) => p.active && !p.display_authorized).length }, { name: "Inativos", value: data.people.filter((p) => !p.active).length }]} />
          </ChartCard>
        </ChartGrid>
        <p className="muted sm">
          Um único cadastro por pessoa, reaproveitado em quantos cursos e atividades for preciso. Só aparece para alunos e visitantes quem estiver
          <b> ativo</b> e com <b>exibição autorizada</b>.
        </p>
        <div className="chips" role="tablist" style={{ margin: "16px 0" }}>
          {(["pessoas", "cursos", "atividades"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`filter ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
              {t === "pessoas" ? "Cadastro" : t === "cursos" ? "Professores dos cursos" : "Supervisão e demandas"}
            </button>
          ))}
        </div>

        {tab === "pessoas" && (
          <>
            {data.people.length === 0 && <p className="muted">Nenhum profissional cadastrado ainda.</p>}
            <div className="prof-grid">
              {data.people.map((p) => (
                <article key={p.id} className="prof-item">
                  <div className="fac-tag">
                    <Portrait person={person(p)} />
                    <span>
                      <b>{p.full_name}</b>
                      {p.title ? <em>{p.title}</em> : null}
                    </span>
                  </div>
                  <div className="prof-flags">
                    <span className={`prof-flag ${p.active ? "on" : ""}`}>{p.active ? "Ativo" : "Inativo"}</span>
                    <span className={`prof-flag ${p.display_authorized ? "on" : ""}`}>{p.display_authorized ? "Exibição autorizada" : "Exibição não autorizada"}</span>
                    {!p.photo_path && <span className="prof-flag">Sem foto</span>}
                  </div>
                  <div className="muted sm">{coursesOf(p.id).join(" · ") || "Sem curso vinculado"}</div>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => setForm({ id: p.id, full_name: p.full_name, title: p.title, specialty: p.specialty, bio: p.bio, active: p.active, display_authorized: p.display_authorized, photo_path: p.photo_path })}>
                      Editar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "cursos" && <CourseLinks data={data} onSaved={refresh} />}
        {tab === "atividades" && <ActivityStaffEditor data={data} onSaved={refresh} />}

        {form && <PersonForm form={form} setForm={setForm} urls={data.urls} onSaved={refresh} />}
      </main>
    </AppShell>
  );
}

function PersonForm({ form, setForm, urls, onSaved }: { form: Form; setForm: (f: Form | null) => void; urls: Record<string, string>; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const current = removePhoto ? null : preview ?? (form.photo_path ? urls[form.photo_path] ?? null : null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const err = photoError(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    setRemovePhoto(false);
  };

  async function save() {
    const name = form.full_name.trim();
    if (name.length < 2) { toast.error("Informe o nome completo."); return; }
    setBusy(true);
    try {
      const row = { full_name: name, title: form.title.trim(), specialty: form.specialty.trim(), bio: form.bio.trim(), active: form.active, display_authorized: form.display_authorized };
      let id = form.id;
      if (id) {
        const r = await supabase.from("learning_professionals").update(row).eq("id", id);
        if (r.error) throw r.error;
      } else {
        const r = await supabase.from("learning_professionals").insert(row).select("id").single();
        if (r.error) throw r.error;
        id = r.data.id;
      }
      const old = form.photo_path;
      if (file) {
        const path = `${id}/${crypto.randomUUID()}.${PHOTO_TYPES[file.type]}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw new Error("photo");
        const r = await supabase.from("learning_professionals").update({ photo_path: path }).eq("id", id);
        if (r.error) { await supabase.storage.from(BUCKET).remove([path]); throw r.error; }
        if (old) await supabase.storage.from(BUCKET).remove([old]);
      } else if (removePhoto && old) {
        const r = await supabase.from("learning_professionals").update({ photo_path: null }).eq("id", id);
        if (r.error) throw r.error;
        await supabase.storage.from(BUCKET).remove([old]);
      }
      toast.success("Profissional salvo.");
      setForm(null);
      onSaved();
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast.error(code === "23505" ? "Já existe um profissional com esse nome." : (e as Error).message === "photo" ? "Não foi possível enviar a foto." : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!form.id || !confirm(`Excluir ${form.full_name}? Os vínculos com cursos e atividades também serão removidos.`)) return;
    setBusy(true);
    const { error } = await supabase.from("learning_professionals").delete().eq("id", form.id);
    if (!error && form.photo_path) await supabase.storage.from(BUCKET).remove([form.photo_path]);
    setBusy(false);
    if (error) { toast.error("Não foi possível excluir."); return; }
    toast.success("Profissional excluído.");
    setForm(null);
    onSaved();
  }

  return (
    <div className="wb-modal" role="dialog" aria-modal="true" aria-label={form.id ? "Editar profissional" : "Novo profissional"}>
      <div className="wb-modal-in">
        <h3 style={{ marginTop: 0 }}>{form.id ? "Editar profissional" : "Novo profissional"}</h3>
        <div className="prof-photo">
          <Portrait person={{ id: form.id, fullName: form.full_name || "?", title: "", specialty: "", bio: "", photoUrl: current }} size="lg" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
              {current ? "Substituir foto" : "Adicionar foto"}
            </Button>
            {current && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); setRemovePhoto(true); }}>
                Remover foto
              </Button>
            )}
            <span className="muted sm">Opcional · JPG, PNG ou WEBP · até 2 MB</span>
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Foto do profissional" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <label>Nome completo<input value={form.full_name} maxLength={160} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
        <div className="wb-2col">
          <label>Cargo ou título profissional<input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>Especialidade jurídica<input value={form.specialty} maxLength={200} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></label>
        </div>
        <label>Minibiografia<textarea rows={5} maxLength={2000} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        <label className="prof-check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Ativo</label>
        <label className="prof-check">
          <input type="checkbox" checked={form.display_authorized} onChange={(e) => setForm({ ...form, display_authorized: e.target.checked })} />
          O profissional autorizou a exibição do nome, foto, cargo e minibiografia
        </label>
        <div className="wb-modal-actions">
          {form.id && <Button variant="ghost" onClick={remove} disabled={busy}>Excluir</Button>}
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
          <Button disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar"}</Button>
        </div>
      </div>
    </div>
  );
}

type Data = Awaited<ReturnType<typeof loadAdmin>>;

function CourseLinks({ data, onSaved }: { data: Data; onSaved: () => void }) {
  const [courseId, setCourseId] = useState(data.courses[0]?.id ?? "");
  const initial = useMemo(() => data.links.filter((l) => l.program_id === courseId).sort((a, b) => a.position - b.position), [data.links, courseId]);
  const [picked, setPicked] = useState<string[]>([]);
  const [lead, setLead] = useState<string>("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPicked(initial.map((l) => l.professional_id));
    setLead(initial.find((l) => l.is_lead)?.professional_id ?? "");
  }, [initial]);

  async function save() {
    if (lead && !picked.includes(lead)) { toast.error("O professor principal precisa estar vinculado ao curso."); return; }
    setBusy(true);
    try {
      const removed = initial.filter((l) => !picked.includes(l.professional_id)).map((l) => l.professional_id);
      if (removed.length) {
        const r = await supabase.from("learning_course_professionals").delete().eq("program_id", courseId).in("professional_id", removed);
        if (r.error) throw r.error;
      }
      const clear = await supabase.from("learning_course_professionals").update({ is_lead: false }).eq("program_id", courseId);
      if (clear.error) throw clear.error;
      if (picked.length) {
        const r = await supabase.from("learning_course_professionals").upsert(picked.map((id, i) => ({ program_id: courseId, professional_id: id, position: i, is_lead: false })));
        if (r.error) throw r.error;
      }
      if (lead) {
        const r = await supabase.from("learning_course_professionals").update({ is_lead: true }).eq("program_id", courseId).eq("professional_id", lead);
        if (r.error) throw r.error;
      }
      toast.success("Professores do curso salvos.");
      onSaved();
    } catch {
      toast.error("Não foi possível salvar os vínculos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <select className="wb-select" value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Curso">
        {data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      {data.people.length === 0 ? (
        <p className="muted">Cadastre um profissional primeiro.</p>
      ) : (
        <div className="prof-scroll">
          <table className="prof-table" style={{ marginTop: 14 }}>
            <thead><tr><th>Vinculado</th><th>Profissional</th><th>Principal</th></tr></thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.id}>
                  <td><input type="checkbox" aria-label={`Vincular ${p.full_name}`} checked={picked.includes(p.id)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, p.id] : x.filter((y) => y !== p.id)))} /></td>
                  <td>{p.full_name}{!p.active || !p.display_authorized ? <span className="muted sm"> · não exibido</span> : null}</td>
                  <td><input type="radio" name="lead" aria-label={`${p.full_name} como professor principal`} checked={lead === p.id} disabled={!picked.includes(p.id)} onChange={() => setLead(p.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted sm">O professor principal aparece na página do curso e supervisiona as atividades que não tiverem outra escolha.</p>
      <Button disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar professores do curso"}</Button>
    </section>
  );
}

function ActivityStaffEditor({ data, onSaved }: { data: Data; onSaved: () => void }) {
  const [courseId, setCourseId] = useState(data.courses[0]?.id ?? "");
  const course = data.courses.find((c) => c.id === courseId);
  const rowsFor = () =>
    Object.fromEntries(
      (course?.activities ?? []).map((a) => {
        const r = data.staff.find((s) => s.program_id === courseId && s.activity_id === a.id);
        return [a.id, { supervisor_id: r?.supervisor_id ?? "", feedback_professional_id: r?.feedback_professional_id ?? "" }];
      }),
    );
  const [rows, setRows] = useState(rowsFor);
  const [busy, setBusy] = useState(false);
  const [demand, setDemand] = useState<DemandTarget | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRows(rowsFor()), [courseId, data.staff]);
  const linked = data.links.filter((l) => l.program_id === courseId);
  const leadName = data.people.find((p) => p.id === (linked.find((l) => l.is_lead) ?? linked[0])?.professional_id)?.full_name;
  const fallback = leadName ? `Professor do curso (${leadName})` : "Professor do curso (não definido)";

  async function save() {
    setBusy(true);
    const payload = Object.entries(rows).map(([activity_id, r]) => ({
      program_id: courseId,
      activity_id,
      supervisor_id: r.supervisor_id || null,
      feedback_professional_id: r.feedback_professional_id || null,
    }));
    const { error } = await supabase.from("learning_activity_staff").upsert(payload);
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Supervisão das atividades salva.");
    onSaved();
  }

  return (
    <section>
      <select className="wb-select" value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Curso">
        {data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      <div className="prof-scroll">
        <table className="prof-table" style={{ marginTop: 14 }}>
          <thead><tr><th>Atividade</th><th>Supervisor</th><th>Professor do feedback</th><th>Demanda</th></tr></thead>
          <tbody>
            {(course?.activities ?? []).map((a, i) => {
              const r = rows[a.id] ?? { supervisor_id: "", feedback_professional_id: "" };
              const saved = data.staff.find((s) => s.program_id === courseId && s.activity_id === a.id);
              const supId = saved?.supervisor_id || (linked.find((l) => l.is_lead) ?? linked[0])?.professional_id;
              const sup = data.people.find((p) => p.id === supId && p.active && p.display_authorized);
              const summary = [saved?.video_path || saved?.demand_video_url ? "vídeo" : "", saved?.mail_subject || saved?.mail_html ? "e-mail próprio" : ""].filter(Boolean).join(" · ") || "Texto do curso";
              const set = (patch: Partial<typeof r>) => setRows((x) => ({ ...x, [a.id]: { ...r, ...patch } }));
              return (
                <tr key={a.id}>
                  <td>{i + 1}. {a.title}</td>
                  <td>
                    <select className="wb-select" aria-label={`Supervisor da atividade ${i + 1}`} value={r.supervisor_id} onChange={(e) => set({ supervisor_id: e.target.value })}>
                      <option value="">{fallback}</option>
                      {data.people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="wb-select" aria-label={`Professor do feedback da atividade ${i + 1}`} value={r.feedback_professional_id} onChange={(e) => set({ feedback_professional_id: e.target.value })}>
                      <option value="">{fallback}</option>
                      {data.people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </td>
                  <td>
                    <Button type="button" variant="outline" size="sm" aria-label={`Configurar a demanda da atividade ${i + 1}`} onClick={() => setDemand({ programId: courseId, activityId: a.id, title: a.title, index: i, contentFrom: a.demandFrom, contentSubject: a.demandSubject, supervisorName: sup?.full_name ?? null })}>
                      Configurar
                    </Button>
                    <div className="muted sm" style={{ marginTop: 4 }}>{summary}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted sm">Sem escolha específica, a atividade usa o professor principal do curso. Sem vídeo, a sala mostra que ele ainda não foi publicado. Em “Configurar” ficam o vídeo, a capa, o e-mail simulado e os materiais da atividade.</p>
      <Button disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar supervisão"}</Button>
      {demand && <DemandSetup target={demand} row={data.staff.find((s) => s.program_id === demand.programId && s.activity_id === demand.activityId)} onClose={() => setDemand(null)} onSaved={onSaved} />}
    </section>
  );
}
