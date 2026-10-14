import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ChevronDown, Copy, ExternalLink, ImagePlus, PlayCircle, Plus, Save, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RichEditor, type Template } from "@/components/RichEditor";
import { paragraphsToHtml, textToHtml, wordCount } from "@/components/Rich";
import { FileList } from "@/components/FileList";
import { coverFor } from "@/components/CourseCard";
import { deleteFile, saveFile, useFileUrl, type FileRef } from "@/lib/files";
import { actions, useStore, type Activity, type Program } from "@/lib/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/programa/$id")({
  head: () => ({
    meta: [
      { title: "Editar curso — Empiria" },
      { name: "description", content: "Editor de cursos: informações, atividades com texto formatado, mídias e anexos." },
      { property: "og:title", content: "Editar curso — Empiria" },
      { property: "og:description", content: "Editor de cursos da Empiria." },
    ],
  }),
  component: Editor,
});

const MAX_FILE = 20 * 1024 * 1024;
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const uid = () => Math.random().toString(36).slice(2, 10);

const T_CASE: Template[] = [
  {
    label: "Estrutura de caso jurídico",
    html: "<h2>O cliente</h2><p>Quem a banca representa, setor de atuação e relação com a contraparte.</p><h2>Os fatos</h2><ol><li><p>Contrato celebrado em [data], com [cláusulas relevantes].</p></li><li><p>O que aconteceu: [inadimplemento, conduta, valores].</p></li><li><p>O que a outra parte alega.</p></li></ol><h2>Documentos</h2><ul><li><p>Contrato</p></li><li><p>Correspondência entre as partes</p></li></ul><blockquote><p><strong>Caso fictício.</strong> Todo material foi construído para o exercício.</p></blockquote>",
  },
];
const T_DEMAND: Template[] = [
  {
    label: "Instruções de entrega com prazo",
    html: "<p><strong>De:</strong> Dra. Helena Vasconcelos, sócia · <strong>Assunto:</strong> providência urgente</p><p>Preciso da peça até <strong>sexta-feira, 18h</strong>. Ela deve conter:</p><ul><li><p>Qualificação das partes</p></li><li><p>Fundamento na cláusula compromissória</p></li><li><p>Síntese dos fatos e pedido</p></li></ul><blockquote><p><strong>Formato:</strong> .docx ou .pdf, até 5 páginas.</p></blockquote>",
  },
];
const T_FEEDBACK: Template[] = [
  {
    label: "Devolutiva padrão",
    html: "<h3>Antes de abrir o gabarito</h3><p>Releia a demanda e confira se cada instrução expressa foi atendida.</p><h3>Pontos de reflexão</h3><ul><li><p>Você respondeu a todos os pontos sinalizados?</p></li><li><p>Cada fato está ancorado em um documento do caso?</p></li></ul>",
  },
];
const T_ANSWER: Template[] = [
  {
    label: "Gabarito comentado",
    html: "<h2>Peça de referência</h2><p>Resumo da solução esperada.</p><h3>Escolhas de redação</h3><ol><li><p>[Escolha] — por quê.</p></li></ol><blockquote><p><strong>Erro mais comum:</strong> [descrição].</p></blockquote>",
  },
];

/** Fill rich-text fields from legacy plain fields so old content opens in the editor. */
function normalize(p: Program): Program {
  return {
    ...p,
    descriptionHtml: p.descriptionHtml ?? textToHtml(p.description),
    files: p.files ?? [],
    activities: p.activities.map((a) => ({
      ...a,
      caseHtml: a.caseHtml ?? paragraphsToHtml(a.caseParagraphs),
      demandHtml: a.demandHtml ?? textToHtml(a.demandBody),
      feedbackHtml: a.feedbackHtml ?? textToHtml(a.feedbackGuidance),
      answerHtml: a.answerHtml ?? "",
      files: a.files ?? [],
      answerFiles: a.answerFiles ?? [],
    })),
  };
}

function Editor() {
  const { id } = Route.useParams();
  const stored = useStore((s) => s.programs.find((p) => p.id === id));
  const [p, setP] = useState<Program | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"geral" | "atividades" | "midias">("geral");
  const [open, setOpen] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  useEffect(() => {
    if (stored && !p) setP(normalize(stored));
  }, [stored, p]);

  useBlocker({ shouldBlockFn: () => dirty && !window.confirm("Há alterações não salvas. Sair mesmo assim?"), enableBeforeUnload: dirty });

  const save = useCallback(() => {
    if (!p) return;
    // keep the plain fields in sync for places that still read them
    actions.saveProgram({ ...p, description: p.descriptionHtml?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? p.description });
    setDirty(false);
    toast.success("Curso salvo", { description: p.title });
  }, [p]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [save]);

  if (!p)
    return (
      <AppShell>
        <main className="pane">
          <h1>{stored === undefined ? "Carregando…" : "Curso não encontrado"}</h1>
          <Link to="/admin" className="btn">
            Voltar
          </Link>
        </main>
      </AppShell>
    );

  const up = (patch: Partial<Program>) => {
    setDirty(true);
    setP((cur) => (cur ? { ...cur, ...patch } : cur));
  };
  const upA = (i: number, patch: Partial<Activity>) =>
    up({ activities: p.activities.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const pulse = (aid: string) => {
    setFlash(aid);
    setTimeout(() => setFlash(null), 700);
  };
  const move = (i: number, d: number) => {
    const a = [...p.activities];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j]!, a[i]!];
    up({ activities: a });
    if (open === i) setOpen(j);
    pulse(a[j]!.id);
  };
  const duplicate = (i: number) => {
    const src = p.activities[i]!;
    const copy: Activity = { ...structuredClone(src), id: uid(), title: `${src.title} (cópia)`, shortTitle: `${src.shortTitle} (cópia)` };
    const a = [...p.activities];
    a.splice(i + 1, 0, copy);
    up({ activities: a });
    setOpen(i + 1);
    pulse(copy.id);
    toast.success("Atividade duplicada", { description: copy.title });
  };
  const add = () => {
    const a = normalize({ ...p, activities: [actions.newActivity(p.activities.length + 1)] }).activities[0]!;
    up({ activities: [...p.activities, a] });
    setOpen(p.activities.length);
    pulse(a.id);
    toast("Nova atividade adicionada");
  };
  const remove = (i: number) => {
    const a = p.activities[i]!;
    [...(a.files ?? []), ...(a.answerFiles ?? [])].forEach((f) => deleteFile(f.id));
    up({ activities: p.activities.filter((_, j) => j !== i) });
    toast("Atividade excluída", { description: a.title });
  };
  const setStatus = (status: Program["status"]) => {
    up({ status });
    toast(`Status: ${STATUS[status]}`, { description: "Salve para aplicar no site." });
  };

  const totalWords =
    wordCount(p.descriptionHtml ?? "") +
    p.activities.reduce((n, a) => n + wordCount((a.caseHtml ?? "") + (a.demandHtml ?? "") + (a.feedbackHtml ?? "") + (a.answerHtml ?? "")), 0);

  return (
    <AppShell>
      <div className="proghead" style={{ flexWrap: "wrap", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div className="crumbs">
            <Link to="/admin">Administração</Link> › <b>Editor de curso</b>
          </div>
          <h2 style={{ fontSize: 24, marginTop: 4 }}>{p.title || "Sem título"}</h2>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {(Object.keys(STATUS) as Program["status"][]).map((s) => (
              <button key={s} className={`spill ${s} ${p.status === s ? "on" : ""}`} onClick={() => setStatus(s)} aria-pressed={p.status === s}>
                <i /> {STATUS[s]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`savedot ${dirty ? "dirty" : ""}`}>
            <i /> {dirty ? "Alterações não salvas" : "Tudo salvo"}
          </span>
          <a className="btn ghost sm" href={`/programa/${p.slug}`} target="_blank" rel="noreferrer">
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <ExternalLink size={14} /> Página do curso
            </span>
          </a>
          {p.activities.length > 0 && (
            <a className="btn ghost sm" href={`/estagio/${p.slug}/1/caso`} target="_blank" rel="noreferrer">
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <PlayCircle size={14} /> Pré-visualizar como aluno
              </span>
            </a>
          )}
          <button className="btn sm" onClick={save} disabled={!dirty} title="Salvar (Ctrl+S)">
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <Save size={14} /> Salvar
            </span>
          </button>
        </div>
      </div>

      <div style={{ padding: "18px 34px 0", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div className="tabs" role="tablist">
          {(
            [
              ["geral", "Informações gerais & preço"],
              ["atividades", `Atividades & módulos (${p.activities.length})`],
              ["midias", "Mídias & anexos"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        <span className="muted sm" style={{ marginLeft: "auto" }}>
          {totalWords} palavras no curso · ≈ {Math.max(1, Math.round(totalWords / 200))} min de leitura
        </span>
      </div>

      <main className="pane">
        {tab === "geral" && (
          <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <TextField l="Título" v={p.title} on={(v) => up({ title: v })} />
              <TextField l="Endereço da página (slug)" v={p.slug} on={(v) => up({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <TextField l="Área" v={p.area} on={(v) => up({ area: v })} />
                <TextField l="Tipo (ex: Curso prático)" v={p.kind} on={(v) => up({ kind: v })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumField l="Preço de pré-venda (R$)" v={p.price} on={(v) => up({ price: v })} />
                <NumField l="Preço cheio (R$, opcional)" v={p.fullPrice ?? null} on={(v) => up({ fullPrice: v })} />
              </div>
              {p.price != null && p.fullPrice != null && p.fullPrice > p.price && (
                <p className="sm" style={{ color: "var(--ok)", fontWeight: 600, marginTop: -6 }}>
                  Economia exibida: {Math.round((1 - p.price / p.fullPrice) * 100)}%
                </p>
              )}
              <TextField l="Chamada no catálogo" v={p.tagline} on={(v) => up({ tagline: v })} area />
              <TextField l="O que você vai dominar (um por linha)" v={(p.learn ?? []).join("\n")} on={(v) => up({ learn: lines(v) })} area />
              <TextField l="O curso inclui (um por linha)" v={(p.includes ?? []).join("\n")} on={(v) => up({ includes: lines(v) })} area />
              <TextField l="Habilidades do certificado (uma por linha)" v={p.skills.join("\n")} on={(v) => up({ skills: lines(v) })} area />
            </div>
            <div>
              <div className="field">
                <span>Apresentação do curso</span>
              </div>
              <RichEditor value={p.descriptionHtml ?? ""} onChange={(h) => up({ descriptionHtml: h })} placeholder="Apresente o curso, o método e os casos…" />
            </div>
          </div>
        )}

        {tab === "atividades" && (
          <>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 10 }}>
              <p className="muted sm" style={{ margin: 0 }}>
                Cada atividade segue as 4 etapas: O caso → A demanda → A devolutiva → O gabarito.
              </p>
              <button className="btn sm" style={{ marginLeft: "auto" }} onClick={add}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Plus size={14} /> Nova atividade
                </span>
              </button>
            </div>
            {p.activities.length === 0 && (
              <div className="dropzone" onClick={add}>
                Nenhuma atividade ainda
                <small>Clique para criar a primeira</small>
              </div>
            )}
            {p.activities.map((a, i) => (
              <div className={`actcard ${flash === a.id ? "flash" : ""}`} key={a.id}>
                <div className="ah">
                  <span className="num" style={{ background: "var(--plum-tint)", borderColor: "var(--plum-edge)", color: "var(--plum)" }}>
                    {i + 1}
                  </span>
                  <button style={{ fontWeight: 700, textAlign: "left", flex: 1, minWidth: 0, display: "flex", gap: 8, alignItems: "center" }} onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span className="muted sm" style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                      · {a.duration} · {(a.files?.length ?? 0) + (a.answerFiles?.length ?? 0)} anexos
                    </span>
                    <ChevronDown size={16} style={{ marginLeft: "auto", transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s", flex: "none" }} />
                  </button>
                  <button className="ibtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima" title="Mover para cima">
                    <ArrowUp size={16} />
                  </button>
                  <button className="ibtn" onClick={() => move(i, 1)} disabled={i === p.activities.length - 1} aria-label="Mover para baixo" title="Mover para baixo">
                    <ArrowDown size={16} />
                  </button>
                  <button className="ibtn" onClick={() => duplicate(i)} aria-label="Duplicar" title="Duplicar">
                    <Copy size={16} />
                  </button>
                  <button className="ibtn danger" onClick={() => setConfirmDel(i)} aria-label="Excluir" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
                {open === i && (
                  <div className="ab">
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr", gap: 12, marginTop: 16 }} className="grid2">
                      <TextField l="Título" v={a.title} on={(v) => upA(i, { title: v })} />
                      <TextField l="Título curto" v={a.shortTitle} on={(v) => upA(i, { shortTitle: v })} />
                      <TextField l="Duração" v={a.duration} on={(v) => upA(i, { duration: v })} />
                    </div>
                    <TextField l="Resumo (aparece na grade curricular)" v={a.summary} on={(v) => upA(i, { summary: v })} />

                    <Stage n={1} t="O caso" />
                    <RichEditor value={a.caseHtml ?? ""} onChange={(h) => upA(i, { caseHtml: h })} templates={T_CASE} placeholder="Briefing do caso e contexto do cliente…" />
                    <div style={{ marginTop: 12 }}>
                      <Uploader label="Anexos do caso e da demanda (contratos, despachos, regulamentos)" files={a.files ?? []} onChange={(files) => upA(i, { files })} />
                    </div>

                    <Stage n={2} t="A demanda e instruções" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="grid2">
                      <TextField l="De" v={a.demandFrom} on={(v) => upA(i, { demandFrom: v })} />
                      <TextField l="Assunto" v={a.demandSubject} on={(v) => upA(i, { demandSubject: v })} />
                    </div>
                    <RichEditor value={a.demandHtml ?? ""} onChange={(h) => upA(i, { demandHtml: h })} templates={T_DEMAND} placeholder="O que a sócia pede, prazo e formato…" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }} className="grid2">
                      <TextField l="Legenda do vídeo da demanda" v={a.demandVideoCaption} on={(v) => upA(i, { demandVideoCaption: v })} />
                      <TextField l="Orientação de envio" v={a.uploadHint} on={(v) => upA(i, { uploadHint: v })} />
                    </div>

                    <Stage n={3} t="A devolutiva" />
                    <RichEditor value={a.feedbackHtml ?? ""} onChange={(h) => upA(i, { feedbackHtml: h })} templates={T_FEEDBACK} placeholder="Orientação imediata após a entrega…" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }} className="grid2">
                      <TextField l="Pontos de reflexão (um por linha)" v={a.reflectionPoints.join("\n")} on={(v) => upA(i, { reflectionPoints: lines(v) })} area />
                      <TextField l="Critérios da rubrica (um por linha)" v={a.rubric.map((r) => r.criterion).join("\n")} on={(v) => upA(i, { rubric: lines(v).map((criterion) => ({ criterion })) })} area />
                    </div>

                    <Stage n={4} t="O gabarito modelo" />
                    <RichEditor value={a.answerHtml ?? ""} onChange={(h) => upA(i, { answerHtml: h })} templates={T_ANSWER} placeholder="Comentário do gabarito e escolhas de redação…" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }} className="grid2">
                      <TextField l="Link do vídeo de debriefing (opcional)" v={a.answerVideoUrl} on={(v) => upA(i, { answerVideoUrl: v })} />
                      <TextField l="Legenda do vídeo" v={a.answerVideoCaption} on={(v) => upA(i, { answerVideoCaption: v })} />
                    </div>
                    <Uploader label="Peça de referência e minutas modelo" files={a.answerFiles ?? []} onChange={(answerFiles) => upA(i, { answerFiles })} />
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {tab === "midias" && (
          <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            <div>
              <h3>Imagem de capa</h3>
              <p className="muted sm">Aparece no catálogo e na página do curso. Proporção recomendada 16:10.</p>
              <CoverUploader program={p} onChange={(coverFile) => up({ coverFile })} />
            </div>
            <div>
              <h3>Arquivos do curso</h3>
              <p className="muted sm">Regulamentos, guias e minutas disponíveis na página do curso.</p>
              <Uploader label="Enviar arquivos do curso" files={p.files ?? []} onChange={(files) => up({ files })} />
              <h4>Anexos por atividade</h4>
              {p.activities.map((a, i) => (
                <div key={a.id} style={{ marginBottom: 14 }}>
                  <b className="sm">
                    {i + 1}. {a.shortTitle}
                  </b>
                  <div className="muted sm" style={{ marginBottom: 6 }}>
                    {(a.files?.length ?? 0) + (a.answerFiles?.length ?? 0)} arquivos
                  </div>
                  <FileList
                    files={[...(a.files ?? []), ...(a.answerFiles ?? [])]}
                    onDelete={(f) => {
                      deleteFile(f.id);
                      upA(i, { files: (a.files ?? []).filter((x) => x.id !== f.id), answerFiles: (a.answerFiles ?? []).filter((x) => x.id !== f.id) });
                      toast("Arquivo removido", { description: f.name });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <AlertDialog open={confirmDel !== null} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDel !== null ? p.activities[confirmDel]?.title : ""}" e seus anexos serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDel !== null) remove(confirmDel);
                setConfirmDel(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

const STATUS: Record<Program["status"], string> = { draft: "Rascunho", published: "Publicado", soon: "Em breve" };

function Stage({ n, t }: { n: number; t: string }) {
  return (
    <div className="stage-h">
      <span className="n">{n}</span>
      <b>{t}</b>
    </div>
  );
}

function Drop({ onFiles, accept, multiple = true, children }: { onFiles: (f: File[]) => void; accept?: string; multiple?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <div
        className={`dropzone ${over ? "over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFiles(Array.from(e.dataTransfer.files));
        }}
      >
        {children}
      </div>
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </>
  );
}

async function storeAll(files: File[]) {
  const ok: FileRef[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE) {
      toast.error(`${f.name} passa de 20 MB`);
      continue;
    }
    try {
      ok.push(await saveFile(f));
    } catch {
      toast.error(`Não foi possível guardar ${f.name}`);
    }
  }
  return ok;
}

function Uploader({ label, files, onChange }: { label: string; files: FileRef[]; onChange: (f: FileRef[]) => void }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Drop
        onFiles={async (fs) => {
          const ok = await storeAll(fs);
          if (ok.length) {
            onChange([...files, ...ok]);
            toast.success(ok.length === 1 ? "Arquivo anexado" : `${ok.length} arquivos anexados`, { description: ok.map((f) => f.name).join(", ") });
          }
        }}
      >
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <Upload size={16} /> {label}
        </span>
        <small>Arraste ou clique · PDF, DOCX, imagens · até 20 MB cada</small>
      </Drop>
      <FileList
        files={files}
        onDelete={(f) => {
          deleteFile(f.id);
          onChange(files.filter((x) => x.id !== f.id));
          toast("Arquivo removido", { description: f.name });
        }}
      />
    </div>
  );
}

function CoverUploader({ program, onChange }: { program: Program; onChange: (f: FileRef | null) => void }) {
  const url = useFileUrl(program.coverFile?.id);
  const pick = async (fs: File[]) => {
    const f = fs[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Escolha uma imagem (JPG, PNG ou WebP)");
      return;
    }
    const [ref] = await storeAll([f]);
    if (!ref) return;
    if (program.coverFile) deleteFile(program.coverFile.id);
    onChange(ref);
    toast.success("Capa atualizada");
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ borderRadius: 20, overflow: "hidden", aspectRatio: "16/10", background: "var(--plum-tint)", position: "relative" }}>
        <img src={url ?? coverFor(program)} alt="Capa do curso" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {!program.coverFile && (
          <span className="pillbadge" style={{ position: "absolute", top: 12, left: 12, fontSize: 11.5 }}>
            Capa padrão
          </span>
        )}
      </div>
      <Drop onFiles={pick} accept="image/*" multiple={false}>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <ImagePlus size={16} /> {program.coverFile ? "Trocar capa" : "Enviar capa"}
        </span>
        <small>Arraste uma imagem ou clique para selecionar</small>
      </Drop>
      {program.coverFile && (
        <button
          className="btn ghost sm"
          style={{ justifySelf: "start" }}
          onClick={() => {
            deleteFile(program.coverFile!.id);
            onChange(null);
            toast("Capa removida — usando a padrão");
          }}
        >
          Remover capa
        </button>
      )}
    </div>
  );
}

function TextField({ l, v, on, area }: { l: string; v: string; on: (v: string) => void; area?: boolean }) {
  return (
    <label className="field">
      <span>{l}</span>
      {area ? <textarea rows={4} value={v} onChange={(e) => on(e.target.value)} /> : <input value={v} onChange={(e) => on(e.target.value)} />}
    </label>
  );
}
function NumField({ l, v, on }: { l: string; v: number | null; on: (v: number | null) => void }) {
  return (
    <label className="field">
      <span>{l}</span>
      <input type="number" min={0} value={v ?? ""} onChange={(e) => on(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} />
    </label>
  );
}
