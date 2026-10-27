import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ActivityLayout, NotFoundBlock, useActivity } from "@/components/ActivityLayout";
import { Steps } from "@/components/AppShell";
import { downloadDoc } from "@/lib/store";
import { useLearning } from "@/lib/learning";
import { deliverActivity } from "@/lib/learning.functions";
import { deliverySchema } from "@/lib/learning-rules";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Rich } from "@/components/Rich";
import { FileList } from "@/components/FileList";

export const Route = createFileRoute("/estagio/$slug/$n/demanda")({
  head: () => ({
    meta: [
      { title: "A demanda — Empiria" },
      { name: "description", content: "Instrução da tarefa, materiais de apoio e envio da sua entrega." },
      { property: "og:title", content: "A demanda — Empiria" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Receba a demanda e envie sua entrega para correção." },
    ],
  }),
  component: DemandPage,
});

const AI_USES = ["Não utilizei IA", "Pesquisa exploratória inicial", "Revisão de clareza do próprio texto", "Geração de trechos do texto"];

function DemandPage() {
  const { slug, n } = Route.useParams();
  const nav = useNavigate();
  const { program, activity, idx } = useActivity(slug, n);
  const [file, setFile] = useState<File | null>(null);
  const [ai, setAi] = useState<string[]>([]);
  const [chat, setChat] = useState<{ me: boolean; t: string }[]>([
    { me: true, t: "Como se estrutura a qualificação das partes num requerimento?" },
    { me: false, t: "Vem antes dos fatos, em parágrafo corrido e não em lista: razão social completa, CNPJ, endereço e forma de representação." },
  ]);
  const [ask, setAsk] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const learning = useLearning();
  const deliver = useServerFn(deliverActivity);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  if (!program || !activity) return <NotFoundBlock />;

  const send = async () => {
    if (!file || !learning.user || sending) return;
    setSending(true); setError("");
    const path = `${learning.user.id}/${program.id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
    let uploaded = false;
    try {
      const payload = deliverySchema.parse({ programId: program.id, activityId: activity.id, fileName: file.name, fileSize: file.size, filePath: path, aiUse: ai.join("; ") || "Não declarado" });
      const result = await supabase.storage.from("learner-submissions").upload(path, file, { upsert: false });
      if (result.error) throw new Error("Não foi possível enviar o arquivo.");
      uploaded = true;
      await deliver({ data: payload });
      await learning.refresh();
      await nav({ to: "/estagio/$slug/$n/devolutiva", params: { slug, n } });
    } catch (e) {
      if (uploaded) await supabase.storage.from("learner-submissions").remove([path]);
      setError(e instanceof Error ? e.message : "Não foi possível salvar a entrega.");
    } finally { setSending(false); }
  };
  const askAssistant = (q = ask) => {
    if (!q.trim()) return;
    const ask_ = q;
    const delegating = /escrev|faz|redij|pronto|faça/i.test(ask_);
    setChat((c) => [
      ...c,
      { me: true, t: ask_ },
      {
        me: false,
        t: delegating
          ? "Não. Redija a sua e me pergunte se ficou no padrão — eu comento a forma, não produzo o conteúdo."
          : "Boa pergunta. Comece pela instrução da demanda e confira nos materiais anexos o que a sustenta. Quer que eu comente a estrutura depois que você escrever um rascunho?",
      },
    ]);
    setAsk("");
  };

  const rail = (
    <>
      <div className="video">
        <div className="play" />
        <div className="cap">{activity.demandVideoCaption}</div>
      </div>
      <p className="muted sm">A demanda chega por vídeo ou por e-mail — como chegaria de verdade.</p>
      <h4>Materiais</h4>
      <div className="files">
        {activity.attachments.map((d) => (
          <div className="file" key={d.name}>
            <span className="ic">DOC</span>
            {d.name}
            <button className="dl" onClick={() => downloadDoc(d)}>
              Baixar
            </button>
          </div>
        ))}
      </div>
      {activity.files?.length ? (
        <div style={{ marginTop: 8 }}>
          <FileList files={activity.files} />
        </div>
      ) : null}
      <h4><span className="nidia-name">Nidia</span> · revisora de método</h4>
      <div className="assist">
        <div className="hd">Disponível durante o exercício</div>
        {chat.map((m, i) => (
          <div key={i} className={`m ${m.me ? "me" : "ai"}`}>
            {m.t}
          </div>
        ))}
        <div className="chips" style={{ marginTop: 10 }}>
          {["Como estruturo os pedidos?", "Onde fundamento a competência?", "Meu parágrafo está no padrão?"].map((q) => (
            <button key={q} className="filter" onClick={() => askAssistant(q)}>{q}</button>
          ))}
        </div>
        <input
          className="input"
          style={{ marginTop: 10 }}
          placeholder="Pergunte sobre forma ou método…"
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askAssistant()}
        />
        <div className="foot">Orienta linguagem, estrutura, formatação e método de pesquisa.</div>
      </div>
    </>
  );

  return (
    <ActivityLayout program={program} activity={activity} idx={idx} rail={rail}>
      <Steps current={2} done={1} />
      <div className="eyebrow">A demanda</div>
      <div className="mail">
        <div className="from">
          <b>{activity.demandFrom}</b> · Assunto: {activity.demandSubject}
        </div>
        {activity.demandHtml ? <Rich html={activity.demandHtml} /> : <p>{activity.demandBody}</p>}
      </div>
      <h4>Sua entrega</h4>
      <div
        className="drop"
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setFile(e.dataTransfer.files[0] ?? null);
        }}
      >
        {file ? `Arquivo selecionado: ${file.name}` : "Arraste o arquivo ou selecione"}
        <small>{file ? `${(file.size / 1024).toFixed(0)} KB · clique para trocar` : activity.uploadHint}</small>
      </div>
      <input ref={input} type="file" accept=".doc,.docx,.pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <h4>Uso de inteligência artificial</h4>
      <p className="muted sm">Declare como usou. A avaliação não pune o uso — classifica cada emprego.</p>
      <div className="chips">
        {AI_USES.map((u) => (
          <button key={u} className={`filter ${ai.includes(u) ? "on" : ""}`} onClick={() => setAi((a) => (a.includes(u) ? a.filter((x) => x !== u) : [...a, u]))}>
            {u}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <Button className="btn" onClick={send} disabled={!file || sending}>
        {sending ? "Enviando…" : "Enviar para correção"}
      </Button>
      <div className="lockline">O gabarito é liberado somente depois que você enviar.</div>
    </ActivityLayout>
  );
}
