import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { askNidia, nidiaState } from "@/lib/nidia.functions";
import { ActivityLayout, NotFoundBlock, useActivity } from "@/components/ActivityLayout";
import { Steps } from "@/components/AppShell";
import { useLearning } from "@/lib/learning";
import { deliverActivity } from "@/lib/learning.functions";
import { ATTEMPT_LIMIT_MESSAGE, UPLOAD_RULES_LABEL, attemptStatus, deliverySchema, pageGuidance } from "@/lib/learning-rules";
import { ActivityVideo } from "@/components/FacultyMedia";
import { DemandMail, MaterialLibrary } from "@/components/DemandRoom";
import { learningFileUrl } from "@/lib/learning.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileList } from "@/components/FileList";
import { MessageCircle, X, Send, UploadCloud } from "lucide-react";

export const Route = createFileRoute("/estagio/$slug/$n/demanda")({
  head: () => ({
    meta: [
      { title: "A demanda — Empiria" },
      {
        name: "description",
        content: "Instrução da tarefa, materiais de apoio e envio da sua entrega.",
      },
      { property: "og:title", content: "A demanda — Empiria" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Receba a demanda e envie sua entrega para correção.",
      },
    ],
  }),
  component: DemandPage,
});

const AI_USES = [
  "Não utilizei IA",
  "Pesquisa exploratória inicial",
  "Revisão de clareza do próprio texto",
  "Geração de trechos do texto",
];

function DemandPage() {
  const { slug, n } = Route.useParams();
  const nav = useNavigate();
  const { program, activity, idx } = useActivity(slug, n);
  const [file, setFile] = useState<File | null>(null);
  const [ai, setAi] = useState<string[]>([]);
  const [chat, setChat] = useState<{ me: boolean; t: string }[]>([]);
  const [ask, setAsk] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const learning = useLearning();
  const [nidia, setNidia] = useState<{ available: boolean; reason: string | null; limit: number; used: number } | null>(null);
  const [thinking, setThinking] = useState(false);
  const loadNidia = useServerFn(nidiaState);
  const askNidiaFn = useServerFn(askNidia);
  const programId = program?.id;
  const activityId = activity?.id;
  useEffect(() => {
    if (!programId || !activityId || !learning.user) return;
    let live = true;
    loadNidia({ data: { programId, activityId } })
      .then((s) => {
        if (!live) return;
        setNidia(s);
        setChat(s.history.flatMap((h) => [{ me: true, t: h.question }, { me: false, t: h.answer }]));
      })
      .catch(() => live && setNidia({ available: false, reason: "Não foi possível carregar a Nidia.", limit: 0, used: 0 }));
    return () => {
      live = false;
    };
  }, [programId, activityId, learning.user, loadNidia]);
  const input = useRef<HTMLInputElement>(null);
  const deliver = useServerFn(deliverActivity);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const fileUrl = useServerFn(learningFileUrl);
  if (!program || !activity) return <NotFoundBlock />;
  const mine = (learning.data?.submissions ?? [])
    .filter((s) => s.programId === program.id && s.activityId === activity.id)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const attempts = attemptStatus(mine, program.id, activity.id);
  const known = Boolean(learning.data);
  const locked = attempts.reached;
  const openFile = async (id: string) => {
    try {
      window.open(await fileUrl({ data: { id } }), "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível abrir o arquivo.");
    }
  };

  const send = async () => {
    if (!file || !learning.user || sending || !known) return;
    if (locked) {
      setError(ATTEMPT_LIMIT_MESSAGE);
      return;
    }
    setSending(true);
    setError("");
    const path = `${learning.user.id}/${program.id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
    let uploaded = false;
    try {
      const payload = deliverySchema.parse({
        programId: program.id,
        activityId: activity.id,
        fileName: file.name,
        fileSize: file.size,
        filePath: path,
        aiUse: ai.join("; ") || "Não declarado",
      });
      const result = await supabase.storage
        .from("learner-submissions")
        .upload(path, file, { upsert: false });
      if (result.error) throw new Error("Não foi possível enviar o arquivo.");
      uploaded = true;
      const saved = await deliver({ data: payload });
      uploaded = false;
      await learning.refresh();
      setConfirmed(saved.attempt);
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      await new Promise((r) => setTimeout(r, calm ? 300 : 1100));
      await nav({ to: "/estagio/$slug/$n/devolutiva", params: { slug, n } });
    } catch (e) {
      if (uploaded) await supabase.storage.from("learner-submissions").remove([path]);
      setError(e instanceof Error ? e.message : "Não foi possível salvar a entrega.");
    } finally {
      setSending(false);
    }
  };
  const remaining = nidia ? Math.max(0, nidia.limit - nidia.used) : 0;
  const canAsk = Boolean(nidia?.available) && remaining > 0 && !thinking;
  const askAssistant = async (q = ask) => {
    const question = q.trim();
    if (!question || !canAsk) return;
    setThinking(true);
    setAsk("");
    setChat((c) => [...c, { me: true, t: question }]);
    try {
      const r = await askNidiaFn({ data: { programId: program.id, activityId: activity.id, question } });
      setChat((c) => [...c, { me: false, t: r.answer }]);
      setNidia((s) => (s ? { ...s, used: s.used + 1 } : s));
    } catch (e) {
      setChat((c) => [...c, { me: false, t: e instanceof Error ? e.message : "A Nidia não conseguiu responder agora." }]);
    } finally {
      setThinking(false);
    }
  };

  const rail = (
    <>
      <ActivityVideo
        url={activity.staff?.video?.url ?? activity.staff?.demandVideoUrl ?? ""}
        video={activity.staff?.video}
        person={activity.staff?.supervisor ?? null}
        label="Supervisão da atividade"
        emptyTitle="Vídeo da demanda ainda não publicado"
        emptyText="A instrução completa está no e-mail da demanda."
        showNeutral={Boolean(activity.staff)}
      />
      <p className="muted sm">
        A demanda chega por vídeo ou por e-mail — como chegaria de verdade.
      </p>
      <MaterialLibrary activity={activity} />
      {activity.files?.length ? (
        <div style={{ marginTop: 8 }}>
          <FileList files={activity.files} personalName={String(learning.user?.user_metadata?.['full_name'] ?? learning.user?.email ?? "")} />
        </div>
      ) : null}
    </>
  );

  return (
    <ActivityLayout program={program} activity={activity} idx={idx} rail={rail}>
      {chatOpen ? <div className="assist learner-chat-panel" role="dialog" aria-label="Conversa com Nídia"><header className="learner-chat-heading"><span><MessageCircle size={17} /> NÍDIA</span><Button variant="ghost" size="icon" aria-label="Fechar conversa" onClick={() => setChatOpen(false)}><X size={18} /></Button></header>
        <div className="hd">
          {!nidia
            ? "Carregando…"
            : !nidia.available
              ? nidia.reason ?? "Indisponível nesta atividade"
              : `${remaining} de ${nidia.limit} perguntas disponíveis nesta atividade`}
        </div>
        {chat.map((m, i) => (
          <div key={i} className={`m ${m.me ? "me" : "ai"}`} style={{ whiteSpace: "pre-wrap" }}>
            {m.t}
          </div>
        ))}
        {thinking && (
          <div className="m ai" aria-live="polite">
            Nidia está pensando…
          </div>
        )}
        <div className="chips">
          {[
            "Como estruturo os pedidos?",
            "Onde fundamento a competência?",
            "Meu parágrafo está no padrão?",
          ].map((q) => (
            <Button key={q} variant="ghost" className="filter" disabled={!canAsk} onClick={() => askAssistant(q)}>
              {q}
            </Button>
          ))}
        </div>
        <div className="learner-chat-compose"><input
          className="input"
          placeholder="Pergunte sobre forma ou método…"
          value={ask}
          maxLength={600}
          disabled={!canAsk}
          onChange={(e) => setAsk(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askAssistant()}
        /><Button size="icon" aria-label="Enviar pergunta" disabled={!canAsk || !ask.trim()} onClick={() => void askAssistant()}><Send size={17} /></Button></div>
        <div className="foot">Orienta linguagem, estrutura, formatação e método de pesquisa.</div>
      </div> : <Button className="learner-chat-launcher" onClick={() => setChatOpen(true)}><MessageCircle size={20} /> Nídia</Button>}
      <Steps current={2} done={1} />
      <div className="eyebrow">A demanda</div>
      <DemandMail activity={activity} idx={idx} />
      <h4>Sua entrega</h4>
      <div className={`attempts${locked ? " is-full" : ""}`} aria-live="polite">
        <span className="pips" aria-hidden="true">
          {Array.from({ length: attempts.max }, (_, i) => (
            <i key={i} className={i < attempts.used ? "on" : ""} />
          ))}
        </span>
        <span>
          {!known ? (
            "Verificando suas tentativas…"
          ) : attempts.used === 0 ? (
            <>
              Você tem <b>2 tentativas</b> disponíveis.
            </>
          ) : attempts.used === 1 ? (
            <>
              <b>1 de 2</b> tentativas utilizadas. Resta uma última oportunidade de envio.
            </>
          ) : (
            <>
              <b>Limite de 2 tentativas atingido.</b> Suas entregas continuam disponíveis abaixo.
            </>
          )}
        </span>
      </div>
      {mine.length > 0 && (
        <div className="files attempt-files">
          {mine.map((s, i) => (
            <div className="file" key={s.id}>
              <span className="ic">{i + 1}ª</span>
              <span className="attempt-name">
                {s.fileName}
                <small>
                  {new Date(s.submittedAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </small>
              </span>
              <button className="dl" onClick={() => openFile(s.id)}>
                Abrir
              </button>
            </div>
          ))}
        </div>
      )}
      {!locked && (
        <>
          <div
            className="drop"
            role="button"
            tabIndex={0}
            aria-label={file ? `Arquivo selecionado: ${file.name}. Pressione Enter para trocar.` : `Selecionar arquivo da entrega (${UPLOAD_RULES_LABEL})`}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                input.current?.click();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setFile(e.dataTransfer.files[0] ?? null);
            }}
          >
            <UploadCloud size={30} aria-hidden="true" />
            {file ? `Arquivo selecionado: ${file.name}` : "Arraste o arquivo ou selecione"}
            <small>
              {file
                ? `${(file.size / 1024).toFixed(0)} KB · clique para trocar`
                : UPLOAD_RULES_LABEL}
            </small>
          </div>
          {pageGuidance(activity.uploadHint) && <p className="muted sm upload-guidance">{pageGuidance(activity.uploadHint)}</p>}
          <input
            ref={input}
            type="file"
            accept=".doc,.docx,.pdf"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <h4>Uso de inteligência artificial</h4>
          <p className="muted sm">
            Declare como usou. A avaliação não pune o uso — classifica cada emprego.
          </p>
          <div className="chips">
            {AI_USES.map((u) => (
              <button
                key={u}
                className={`filter ${ai.includes(u) ? "on" : ""}`}
                onClick={() => setAi((a) => (a.includes(u) ? a.filter((x) => x !== u) : [...a, u]))}
              >
                {u}
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="attempt-error">
          {error}
        </p>
      )}
      {confirmed !== null ? (
        <div className="attempt-ok" role="status">
          <span className="seal" aria-hidden="true" />
          Entrega registrada · tentativa {confirmed} de {attempts.max}
        </div>
      ) : (
        <Button
          className="btn"
          onClick={send}
          disabled={!file || sending || locked || !known}
          aria-busy={sending}
        >
          {locked
            ? "Limite de tentativas atingido"
            : sending
              ? "Registrando entrega…"
              : attempts.used === 1
                ? "Enviar última tentativa"
                : "Enviar para correção"}
        </Button>
      )}
      <div className="lockline">O gabarito é liberado somente depois que você enviar.</div>
    </ActivityLayout>
  );
}
