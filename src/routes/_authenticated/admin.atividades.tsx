import { AdminHeader, ChartCard, ChartGrid, DonutChart, HBarChart, Kpi, KpiRow, TrendChart, countPoints, dailySeries } from "@/components/admin/AdminKit";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { assistantLimits, saveAssistantLimit } from "@/lib/admin-people.functions";
import { ASSISTANT_LIMIT_MAX, ASSISTANT_LIMIT_MIN } from "@/lib/admin-people";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DemandSetup, type DemandTarget } from "@/components/DemandSetup";
import { adminGuard } from "@/lib/admin-guard";
import { commerceHead } from "@/lib/commerce-schema";
import { adminActivityContent, saveActivityRubric } from "@/lib/learning.functions";
import { rubricCriteriaSchema } from "@/lib/activity-content";
import type { Activity, Criterion } from "@/lib/store";

const options = () => queryOptions({ queryKey: ["admin-activity-content"], queryFn: () => adminActivityContent() });
export const Route = createFileRoute("/_authenticated/admin/atividades")({
  beforeLoad: adminGuard,
  head: () => commerceHead("Conteúdo das atividades", "Rubricas docentes e demandas dos cursos da Empiria."),
  loader: ({ context }) => context.queryClient.ensureQueryData(options()),
  component: Activities,
});

function Activities() {
  const { data } = useSuspenseQuery(options());
  const client = useQueryClient();
  const [courseId, setCourseId] = useState(data.programs[0]?.program.id ?? "");
  const course = data.programs.find(p => p.program.id === courseId);
  const [rubric, setRubric] = useState<Activity | null>(null);
  const [demand, setDemand] = useState<DemandTarget | null>(null);
  const refresh = async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ["admin-activity-content"] }), client.invalidateQueries({ queryKey: ["learner-progress"] }), client.invalidateQueries({ queryKey: ["admin-learning"] })]);
  };
  return <AppShell><main className="pane adm-page">
    <AdminHeader title="Conteúdo das atividades" text="Gabaritos, pontos da ficha, e-mail, vídeo e materiais de cada atividade." />
    {(() => {
      const acts = data.programs.flatMap(p => p.program.activities.map(a => ({ p: p.program, a, staff: data.staff.find(s => s.program_id === p.program.id && s.activity_id === a.id) })));
      const withKey = acts.filter(x => x.staff?.answer_key_path).length;
      const withMail = acts.filter(x => x.staff?.mail_subject).length;
      const rubricOk = acts.filter(x => rubricCriteriaSchema.safeParse(x.a.rubric).success).length;
      return <>
        <KpiRow>
          <Kpi label="Atividades" value={acts.length} hint={`${data.programs.length} cursos`} />
          <Kpi label="Com gabarito enviado" value={`${withKey}/${acts.length}`} alert={withKey < acts.length} />
          <Kpi label="Com e-mail da tarefa" value={`${withMail}/${acts.length}`} />
          <Kpi label="Pontos da ficha completos" value={`${rubricOk}/${acts.length}`} />
        </KpiRow>
        <ChartGrid>
          <ChartCard title="Gabaritos enviados por curso">
            <HBarChart data={data.programs.map(p => ({ name: p.program.title, value: acts.filter(x => x.p.id === p.program.id && x.staff?.answer_key_path).length }))} />
          </ChartCard>
          <ChartCard title="Preparação do conteúdo">
            <DonutChart data={[{ name: "Com gabarito", value: withKey }, { name: "Sem gabarito", value: acts.length - withKey }]} />
          </ChartCard>
        </ChartGrid>
      </>;
    })()}
    <div className="ac-courses" role="tablist" aria-label="Curso">
      {data.programs.map(p => <button key={p.program.id} role="tab" aria-selected={p.program.id === courseId} className={p.program.id === courseId ? "on" : ""} onClick={() => setCourseId(p.program.id)}>
        {p.program.title}<span>{p.program.activities.length} atividades</span>
      </button>)}
    </div>
    <div className="ac-list">
    {course?.program.activities.map((a, i) => {
      const complete = rubricCriteriaSchema.safeParse(a.rubric).success;
      const staff = data.staff.find(s => s.program_id === courseId && s.activity_id === a.id);
      const openDemand = () => setDemand({ programId: courseId, activityId: a.id, title: a.title, index: i, contentFrom: a.demandFrom, contentSubject: a.demandSubject, supervisorName: null });
      const checks = [
        { label: "Gabarito", ok: Boolean(staff?.answer_key_path) },
        { label: "E-mail", ok: Boolean(staff?.mail_subject) },
        { label: "Vídeo", ok: Boolean(staff?.video_path || staff?.demand_video_url) },
        { label: "Pontos da ficha", ok: complete },
      ];
      const ready = checks.filter(c => c.ok).length;
      return <section className="ac-card" key={a.id}>
        <header className="ac-hd">
          <span className="ac-num">{String(i + 1).padStart(2, "0")}</span>
          <div className="ac-ttl"><h3>{a.title}</h3><p>{staff?.mail_subject ? `Assunto: ${staff.mail_subject}` : "E-mail da tarefa ainda não escrito"}</p></div>
          <div className="ac-ready" style={{ ["--p" as string]: `${(ready / checks.length) * 100}%` }}><b>{ready}/{checks.length}</b><span>pronto</span></div>
        </header>
        <ul className="ac-checks">{checks.map(c => <li key={c.label} className={c.ok ? "ok" : ""}>{c.ok ? "✓" : "○"} {c.label}</li>)}</ul>
        <div className="ac-tiles">
          <div className="ac-tile">
            <div className="ac-tile-k">1 · Gabarito completo</div>
            <p>{staff?.answer_key_path ? `${staff.answer_key_name}${staff.answer_key_uploaded_at ? ` · enviado em ${new Date(staff.answer_key_uploaded_at).toLocaleDateString("pt-BR")}` : ""}` : "Documento que a correção automática usa como referência."}</p>
            <AnswerKey programId={courseId} activityId={a.id} row={staff} saved={refresh} />
          </div>
          <div className="ac-tile">
            <div className="ac-tile-k">2 · E-mail, vídeo e materiais</div>
            <p>O que o aluno recebe ao abrir a demanda.</p>
            <Button variant="outline" onClick={openDemand}>Editar conteúdo</Button>
          </div>
          <div className="ac-tile">
            <div className="ac-tile-k">3 · Pontos da ficha <em>opcional</em></div>
            <p>{a.rubric.length ? `${a.rubric.length} critérios${complete ? "" : " · preenchimento pendente"}` : "Nenhum critério definido."}</p>
            <Button variant="outline" onClick={() => setRubric(a)}>Editar pontos</Button>
          </div>
        </div>
        <footer className="ac-ft"><AssistantLimit programId={courseId} activityId={a.id} /></footer>
      </section>;
    })}
    </div>
    {!course && <p className="muted">Nenhum curso disponível.</p>}
    {rubric && course && <RubricEditor key={rubric.id} activity={rubric} programId={courseId} updatedAt={course.updatedAt} close={() => setRubric(null)} saved={refresh} />}
    {demand && <DemandSetup target={demand} row={data.staff.find(s => s.program_id === demand.programId && s.activity_id === demand.activityId)} onClose={() => setDemand(null)} onSaved={() => void refresh()} />}
  </main></AppShell>;
}

function RubricEditor({ activity, programId, updatedAt, close, saved }: { activity: Activity; programId: string; updatedAt: string; close: () => void; saved: () => Promise<void> }) {
  const [items, setItems] = useState<Criterion[]>(activity.rubric.map(r => ({ ...r, description: r.description ?? "", weight: r.weight ?? 1 })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = useServerFn(saveActivityRubric);
  const change = (index: number, patch: Partial<Criterion>) => setItems(xs => xs.map((x, i) => i === index ? { ...x, ...patch } : x));
  const total = items.reduce((s, r) => s + (Number.isFinite(r.weight) ? r.weight ?? 0 : 0), 0);
  async function submit() {
    const parsed = rubricCriteriaSchema.safeParse(items);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Confira a rubrica."); return; }
    setBusy(true); setError("");
    try {
      await save({ data: { programId, activityId: activity.id, updatedAt, criteria: parsed.data } });
      await saved(); toast.success("Rubrica salva."); close();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  return <div className="wb-modal" role="dialog" aria-modal="true" aria-label="Rubrica docente"><div className="wb-modal-in">
    <h3>Rubrica · {activity.title}</h3>
    {items.map((r, i) => <div className="prof-item" key={i}>
      <div className="wb-2col">
        <label>Critério {i + 1}<input value={r.criterion} maxLength={200} onChange={e => change(i, { criterion: e.target.value })} /></label>
        <label>Peso {i + 1}<input type="number" min="0.01" step="any" value={Number.isFinite(r.weight) ? r.weight : ""} onChange={e => change(i, { weight: e.target.valueAsNumber })} /></label>
      </div>
      <label>Descrição {i + 1}<textarea rows={3} value={r.description} maxLength={4000} onChange={e => change(i, { description: e.target.value })} /></label>
      <div className="chips"><span className="muted sm">{total > 0 && Number.isFinite(r.weight) ? `${Math.round((r.weight ?? 0) / total * 1000) / 10}% da nota` : "Peso pendente"}</span>
      <Button size="icon" variant="ghost" title={`Remover critério ${i + 1}`} aria-label={`Remover critério ${i + 1}`} disabled={busy} onClick={() => setItems(xs => xs.filter((_, j) => j !== i))}><Trash2 size={16} /></Button></div>
    </div>)}
    <Button variant="outline" disabled={busy || items.length >= 30} onClick={() => setItems(xs => [...xs, { criterion: "", description: "", weight: 1 }])}><Plus size={16} />Adicionar critério</Button>
    {error && <p role="alert" className="attempt-error">{error}</p>}
    <div className="wb-modal-actions"><Button variant="ghost" disabled={busy} onClick={close}>Cancelar</Button><Button disabled={busy} onClick={submit}>{busy ? "Salvando…" : "Salvar rubrica"}</Button></div>
  </div></div>;
}
function AssistantLimit({ programId, activityId }: { programId: string; activityId: string }) {
  const client = useQueryClient();
  const { data } = useQuery({ queryKey: ["assistant-limits"], queryFn: () => assistantLimits() });
  const save = useServerFn(saveAssistantLimit);
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const row = data.rows.find(r => r.program_id === programId && r.activity_id === activityId);
  const limit = Math.min(ASSISTANT_LIMIT_MAX, Math.max(ASSISTANT_LIMIT_MIN, row?.question_limit ?? data.defaultLimit));
  const enabled = row?.enabled ?? true;
  const put = async (next: { limit: number; enabled: boolean }) => {
    setBusy(true);
    try { await save({ data: { programId, activityId, ...next } }); await client.invalidateQueries({ queryKey: ["assistant-limits"] }); toast.success("Assistente atualizado."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  };
  return <div className="chips assistant-limit">
    <label className="muted sm">Perguntas ao assistente
      <select className="wb-select" value={limit} disabled={busy} onChange={e => void put({ limit: Number(e.target.value), enabled })}>
        {Array.from({ length: ASSISTANT_LIMIT_MAX - ASSISTANT_LIMIT_MIN + 1 }, (_, i) => i + ASSISTANT_LIMIT_MIN).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
    <label className="muted sm"><input type="checkbox" checked={enabled} disabled={busy} onChange={e => void put({ limit, enabled: e.target.checked })} /> Assistente ativo</label>
  </div>;
}

function AnswerKey({ programId, activityId, row, saved }: { programId: string; activityId: string; row: { answer_key_path: string | null; answer_key_name: string | null; answer_key_uploaded_at: string | null } | undefined; saved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(pdf|docx?)$/i.test(f.name) || f.size > 25 * 1024 * 1024) { toast.error("Envie o gabarito em PDF, DOC ou DOCX, até 25 MB."); return; }
    setBusy(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const path = `${programId}/answer-keys/${activityId}/${crypto.randomUUID()}.${f.name.split(".").pop()!.toLowerCase()}`;
    try {
      const up = await supabase.storage.from("activity-media").upload(path, f, { upsert: false, contentType: f.type || "application/octet-stream" });
      if (up.error) throw new Error("Não foi possível enviar o gabarito.");
      const { error } = await supabase.from("learning_activity_staff").upsert({ program_id: programId, activity_id: activityId, answer_key_path: path, answer_key_name: f.name, answer_key_uploaded_at: new Date().toISOString() });
      if (error) { await supabase.storage.from("activity-media").remove([path]); throw new Error("Não foi possível registrar o gabarito."); }
      if (row?.answer_key_path) await supabase.storage.from("activity-media").remove([row.answer_key_path]);
      await saved(); toast.success("Gabarito enviado. A correção automática passa a usá-lo nas próximas entregas.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao enviar."); }
    finally { setBusy(false); }
  };
  return <label className="btn answer-key-upload" aria-busy={busy}>
    {busy ? "Enviando…" : row?.answer_key_path ? "Trocar gabarito" : "Enviar gabarito"}
    <input type="file" hidden accept=".pdf,.doc,.docx" disabled={busy} onChange={e => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
  </label>;
}
