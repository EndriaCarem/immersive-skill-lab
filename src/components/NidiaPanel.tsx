import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { askNidia, nidiaThread } from "@/lib/nidia.functions";
import { MAX_QUESTION_CHARS, nidiaMessage, remaining, type NidiaThread } from "@/lib/nidia-rules";

const STARTERS = ["O que esta demanda está pedindo?", "Qual é o formato esperado da entrega?", "Por qual documento começo a leitura?"];

/** Nidia inside the practice room: real answers, quota and history from the backend. Starters fill the field; only sending counts. */
export function NidiaPanel({ programId, activityId, userId }: { programId: string; activityId: string; userId: string }) {
  const key = ["nidia", userId, programId, activityId];
  const client = useQueryClient();
  const load = useServerFn(nidiaThread);
  const ask = useServerFn(askNidia);
  const query = useQuery({ queryKey: key, queryFn: () => load({ data: { programId, activityId } }), refetchOnWindowFocus: true });
  const [text, setText] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const field = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const ids = useId();

  const t = query.data;
  const left = t ? remaining(t) : 0;
  const blocked = !t || !t.available || left === 0 || t.pending;

  useEffect(() => {
    if (!sending) return;
    setElapsed(0);
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [sending]);
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [t?.messages.length, sending]);

  async function send() {
    const q = text.trim();
    if (q.length < 2 || sending || blocked) return;
    setError("");
    setSending(q);
    setText("");
    try {
      const out = await ask({ data: { programId, activityId, question: q } });
      client.setQueryData<NidiaThread>(key, out.thread);
      setFresh(out.message.id);
    } catch (e) {
      setText(q);
      setError(e instanceof Error ? e.message : nidiaMessage("service"));
      client.invalidateQueries({ queryKey: key });
    } finally {
      setSending(null);
      requestAnimationFrame(() => field.current?.focus());
    }
  }

  const status = !t
    ? query.isError ? "Não foi possível carregar a conversa." : "Abrindo a conversa…"
    : !t.available
      ? nidiaMessage(t.reason)
      : left === 0
        ? `Você usou as ${t.limit} perguntas desta atividade. O histórico continua aqui.`
        : null;

  return (
    <div className="assist nidia-assist" aria-labelledby={`${ids}-hd`}>
      <div className="hd nidia-hd" id={`${ids}-hd`}>
        <span>Disponível durante o exercício</span>
        {t?.available && (
          <span className="nidia-quota" aria-live="polite" aria-atomic="true">
            <span key={left} className="nidia-quota-n">{left}</span>
            <span className="sr-only"> de {t.limit} perguntas restantes</span>
            <span aria-hidden="true">/{t.limit}</span>
          </span>
        )}
      </div>
      <div className="nidia-log" ref={log} role="log" aria-live="polite" aria-label="Conversa com a Nidia">
        {t?.messages.length === 0 && !sending && t.available && (
          <p className="nidia-empty">
            Pergunte sobre a demanda, o formato da entrega ou por onde começar. A Nidia orienta o caminho; a peça é sua.
            {" "}Você tem {t.limit} perguntas nesta atividade.
          </p>
        )}
        {t?.messages.map((m) => (
          <div key={m.id} className="nidia-pair">
            <div className="m me"><span className="sr-only">Você: </span>{m.question}</div>
            <div className={`m ai${fresh === m.id ? " nidia-fresh" : ""}`}><span className="sr-only">Nidia: </span>{m.answer}</div>
          </div>
        ))}
        {sending && (
          <div className="nidia-pair">
            <div className="m me nidia-sent"><span className="sr-only">Você: </span>{sending}</div>
            <div className="nidia-wait" role="status">
              <span className="nidia-wait-mark" aria-hidden="true" />
              Nidia está lendo a demanda e os materiais da sala{elapsed >= 3 ? ` · ${elapsed}s` : "…"}
            </div>
          </div>
        )}
      </div>
      {status && <p className="nidia-status">{status}</p>}
      {error && <p className="nidia-error" role="alert">{error}</p>}
      {t?.available && left > 0 && (
        <>
          {t.messages.length === 0 && !sending && (
            <div className="chips" style={{ marginTop: 10 }}>
              {STARTERS.map((q) => (
                <button key={q} type="button" className="filter" onClick={() => { setText(q); field.current?.focus(); }}>
                  {q}
                </button>
              ))}
            </div>
          )}
          <form className="nidia-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label htmlFor={`${ids}-q`} className="sr-only">Sua pergunta para a Nidia</label>
            <textarea
              id={`${ids}-q`}
              ref={field}
              className="input nidia-input"
              rows={2}
              maxLength={MAX_QUESTION_CHARS}
              placeholder="Pergunte sobre a demanda ou o método…"
              value={text}
              disabled={Boolean(sending) || t.pending}
              aria-describedby={`${ids}-ft`}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <div className="nidia-row">
              <span className="nidia-count" aria-hidden={text.length < MAX_QUESTION_CHARS - 100}>
                {text.length >= MAX_QUESTION_CHARS - 100 ? `${text.length}/${MAX_QUESTION_CHARS}` : ""}
              </span>
              <button type="submit" className="nidia-send" disabled={Boolean(sending) || text.trim().length < 2 || t.pending} aria-busy={Boolean(sending)}>
                {sending ? "Aguardando…" : "Perguntar"}
              </button>
            </div>
          </form>
        </>
      )}
      <div className="foot" id={`${ids}-ft`}>Orienta a leitura da demanda, o formato e o método. Não redige a peça nem antecipa o gabarito.</div>
    </div>
  );
}
