import { useState } from "react";

/** Signal band for a 0–10 score. Color never appears without the number/word. */
export const band = (n: number) => (n >= 8 ? { k: "ok", w: "Atendido" } : n >= 5 ? { k: "mid", w: "Parcial" } : { k: "no", w: "Não atendido" });

export function ScoreChip({ n }: { n: number }) {
  const b = band(n);
  return (
    <span className={`sig ${b.k}`}>
      {String(n).replace(".", ",")} · {b.w}
    </span>
  );
}

const CRITERIA: [string, number][] = [
  ["Qualificação das partes", 9],
  ["Convenção de arbitragem", 7],
  ["Fundamentação", 6],
  ["Pedidos", 7.5],
];

/** The "review mark": a document excerpt with struck text, insertions and margin notes by the senior. */
export function ReviewWindow({ compact = false }: { compact?: boolean }) {
  const [notes, setNotes] = useState(true);
  return (
    <div className="rv">
      <div className="rv-bar">
        <span>Requerimento de Arbitragem · revisão do sênior</span>
        <button className="rv-toggle" onClick={() => setNotes((v) => !v)} aria-pressed={notes}>
          {notes ? "Ocultar marcas" : "Mostrar marcas"}
        </button>
      </div>
      <div className={`rv-body ${notes ? "" : "clean"}`}>
        <div className="rv-doc doc-voice">
          <p>
            <b>LOGÍSTICA ATLÂNTICO S.A.</b>, sociedade anônima inscrita no CNPJ sob o nº 00.000.000/0001-00, vem, por seus advogados,
            {" "}<del>requerer a instauração de</del> <ins>apresentar o presente Requerimento de</ins> Arbitragem em face de{" "}
            <b>PORTO SUL TERMINAIS LTDA.</b>, com fundamento na cláusula 18.2 do Contrato.
          </p>
          <p>
            A Requerida <span className="obs">deixou de cumprir</span> as obrigações de movimentação mínima previstas no Anexo III,
            <del> o que é muito grave</del> <ins>gerando prejuízo estimado de R$ 4,2 milhões</ins>.
          </p>
          {!compact && (
            <p>
              Requer-se, ao final, a condenação da Requerida ao pagamento das perdas e danos apurados.
            </p>
          )}
        </div>
        <aside className="rv-margin">
          <div className="rv-note"><b>Sênior</b> Fórmula da câmara: “apresentar Requerimento”, não “instaurar”.</div>
          <div className="rv-note"><b>Sênior</b> Adjetivo não é argumento. Quantifique.</div>
          <div className="rv-note nidia"><b>Nidia</b> Qual cláusula do Anexo III foi descumprida?</div>
        </aside>
      </div>
      <div className="rv-foot">
        {CRITERIA.map(([c, n]) => (
          <div key={c} className="rv-crit">
            <span>{c}</span>
            <ScoreChip n={n} />
          </div>
        ))}
        <div className="rv-total">
          <span>Nota final</span>
          <b>7,3<small>/10</small></b>
        </div>
      </div>
    </div>
  );
}
