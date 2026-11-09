import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Rich } from "@/components/Rich";
import { type Activity, type Doc } from "@/lib/store";
import { downloadPersonalDoc } from "@/lib/personal-download";
import { useAccount } from "@/lib/account";
import { MATERIAL_CATEGORIES, demandMail, materialGroups, type ActivityMaterial } from "@/lib/activity-room";
import { activityMaterialUrl } from "@/lib/learning.functions";
import { fmtSize } from "@/lib/files";

type State = "idle" | "busy" | "done" | "error";
const extLabel = (name: string) => (name.split(".").pop() ?? "DOC").slice(0, 4).toUpperCase();

/** One download action with honest feedback: preparing → downloaded (or a clear failure). */
function useDownload() {
  const { user } = useAccount();
  const sign = useServerFn(activityMaterialUrl);
  const [state, setState] = useState<Record<string, State>>({});
  const set = (k: string, s: State) => setState((x) => ({ ...x, [k]: s }));
  const material = async (m: ActivityMaterial) => {
    if (state[m.id] === "busy") return;
    set(m.id, "busy");
    try {
      const copy = await sign({ data: { id: m.id } });
      const bytes = Uint8Array.from(atob(copy.base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: copy.type }));
      const a = document.createElement("a");
      a.href = url;
      a.download = copy.fileName;
      a.rel = "noopener";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      set(m.id, "done");
    } catch {
      set(m.id, "error");
    }
  };
  const doc = (d: Doc) => {
    downloadPersonalDoc(d, String(user?.user_metadata?.['full_name'] ?? user?.email ?? ""));
    set(`doc:${d.name}`, "done");
  };
  return { state, material, doc };
}

const label = (s: State | undefined, idle = "Baixar") =>
  s === "busy" ? "Preparando…" : s === "done" ? "Baixado" : s === "error" ? "Tentar de novo" : idle;

/**
 * The demand as an office e-mail: sender tied to the supervisor, subject, activity reference,
 * body and related attachments. Nothing is actually sent — it is the simulated communication.
 */
export function DemandMail({ activity, idx }: { activity: Activity; idx: number }) {
  const mail = demandMail(activity, activity.staff);
  const dl = useDownload();
  const materials = activity.materials ?? [];
  const hasAttachments = activity.attachments.length > 0 || materials.length > 0;
  return (
    <article className="mail mail-office" aria-label="E-mail da demanda">
      <header className="mail-head">
        <div className="mail-row">
          <span>De</span>
          <b>{mail.from}</b>
          {mail.fromRole ? <em>{mail.fromRole}</em> : null}
        </div>
        <div className="mail-row">
          <span>Assunto</span>
          <b>{mail.subject}</b>
        </div>
        <div className="mail-row">
          <span>Atividade</span>
          <em>
            {idx + 1}. {activity.title}
          </em>
        </div>
      </header>
      <div className="mail-body">{mail.html ? <Rich html={mail.html} /> : <p>{mail.text}</p>}</div>
      {hasAttachments ? (
        <footer className="mail-attach" aria-label="Anexos do e-mail">
          <span className="k">Anexos</span>
          <div>
            {activity.attachments.map((d) => (
              <button key={`doc:${d.name}`} type="button" className={`mail-clip is-${dl.state[`doc:${d.name}`] ?? "idle"}`} onClick={() => dl.doc(d)} aria-label={`Baixar anexo ${d.name}`}>
                {d.name}
              </button>
            ))}
            {materials.map((m) => (
              <button key={m.id} type="button" className={`mail-clip is-${dl.state[m.id] ?? "idle"}`} onClick={() => dl.material(m)} aria-label={`Baixar anexo ${m.title}`} aria-busy={dl.state[m.id] === "busy"}>
                {m.title}
              </button>
            ))}
          </div>
        </footer>
      ) : null}
    </article>
  );
}

function MaterialRow({ m, state, onGet }: { m: ActivityMaterial; state: State | undefined; onGet: () => void }) {
  const meta = [m.docType || MATERIAL_CATEGORIES[m.category], m.version ? `versão ${m.version}` : "", fmtSize(m.fileSize)].filter(Boolean).join(" · ");
  return (
    <div className={`file lib-item is-${state ?? "idle"}`}>
      <span className="ic">{extLabel(m.fileName)}</span>
      <span className="lib-text">
        <b>{m.title}</b>
        <small>{meta}</small>
        {m.description ? <span className="lib-desc">{m.description}</span> : null}
      </span>
      <button type="button" className="dl" onClick={onGet} aria-busy={state === "busy"} aria-label={`${label(state)}: ${m.title}`}>
        {label(state)}
      </button>
    </div>
  );
}

/**
 * Support library for BEFORE the delivery: case documents/annexes and delivery templates.
 * Answer keys, reference answers and final feedback are never listed here — they stay behind the
 * delivery and pending-review rules of the answer-key page.
 */
export function MaterialLibrary({ activity }: { activity: Activity }) {
  const dl = useDownload();
  const { caseDocs, templates } = materialGroups(activity.materials ?? []);
  const empty = !activity.attachments.length && !caseDocs.length && !templates.length;
  return (
    <section className="lib" aria-label="Materiais disponíveis antes da entrega">
      <h4>Materiais</h4>
      {empty ? <p className="muted sm">Nenhum material publicado para esta atividade.</p> : null}
      {activity.attachments.length || caseDocs.length ? (
        <>
          <div className="lib-k">Documentos do caso</div>
          <div className="files">
            {activity.attachments.map((d) => {
              const st = dl.state[`doc:${d.name}`];
              return (
                <div className={`file lib-item is-${st ?? "idle"}`} key={`doc:${d.name}`}>
                  <span className="ic">DOC</span>
                  <span className="lib-text">
                    <b>{d.name}</b>
                  </span>
                  <button type="button" className="dl" onClick={() => dl.doc(d)} aria-label={`${label(st)}: ${d.name}`}>
                    {label(st)}
                  </button>
                </div>
              );
            })}
            {caseDocs.map((m) => (
              <MaterialRow key={m.id} m={m} state={dl.state[m.id]} onGet={() => dl.material(m)} />
            ))}
          </div>
        </>
      ) : null}
      {templates.length ? (
        <>
          <div className="lib-k">Modelos de entrega</div>
          <div className="files">
            {templates.map((m) => (
              <MaterialRow key={m.id} m={m} state={dl.state[m.id]} onGet={() => dl.material(m)} />
            ))}
          </div>
        </>
      ) : null}
      <p className="lib-lock">Gabarito, resposta de referência e devolutiva final ficam disponíveis somente depois da entrega.</p>
    </section>
  );
}
