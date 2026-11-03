import { z } from "zod";
import type { Activity } from "./store";

/** Bumped whenever the grading instructions change, so every evaluation records which prompt produced it. */
export const PROMPT_VERSION = "empiria-rubrica-v1";
export const GRADING_MODEL = "openai/gpt-6-astra";
export const MAX_TRIES = 3;
/** Text sent to the model is capped to keep cost and latency bounded; longer documents are flagged as truncated. */
export const MAX_DOCUMENT_CHARS = 60_000;
/** Below this many letters a PDF is treated as scanned/image-only and routed to human analysis. */
export const MIN_READABLE_CHARS = 300;

export type AiStatus = "pending" | "extracting" | "evaluating" | "completed" | "failed" | "needs_human_review";
export type RubricItem = { criterion: string; description: string; weight: number };
export type RubricSnapshot = { programId: string; activityId: string; activityTitle: string; criteria: RubricItem[] };
export type AiCriterion = { criterion: string; score: number; comment: string; strengths: string[]; improvements: string[] };
export type AiEvaluation = {
  id: string; submissionId: string; status: AiStatus; issueCode?: string; overallScore?: number;
  overallFeedback?: string; ethicsNote?: string; criteria?: AiCriterion[]; model?: string; completedAt?: string;
};

/** Learner-safe explanation for each non-success code. Never exposes provider or stack details. */
export const ISSUE_MESSAGES: Record<string, string> = {
  rubric_missing: "A rubrica desta atividade ainda não está completa. Sua entrega foi encaminhada para análise da equipe.",
  doc_legacy: "Arquivos .DOC antigos não podem ser lidos automaticamente. Sua entrega foi encaminhada para análise da equipe.",
  pdf_no_text: "Não foi possível ler o texto deste PDF (parece digitalizado). Sua entrega foi encaminhada para análise da equipe.",
  file_unreadable: "O arquivo não pôde ser aberto (corrompido ou protegido). Sua entrega foi encaminhada para análise da equipe.",
  format_mismatch: "O conteúdo do arquivo não corresponde ao formato informado. Sua entrega foi encaminhada para análise da equipe.",
  empty_document: "O documento parece estar vazio. Sua entrega foi encaminhada para análise da equipe.",
  not_evaluable: "A correção automática não conseguiu avaliar esta entrega com segurança. Ela foi encaminhada para análise da equipe.",
  invalid_output: "A correção automática não produziu um resultado válido. Sua entrega foi encaminhada para análise da equipe.",
  refused: "A correção automática não pôde avaliar este conteúdo. Sua entrega foi encaminhada para análise da equipe.",
  service_paused: "A correção automática está temporariamente pausada. Sua entrega continua na fila e será avaliada assim que for retomada.",
  processing_timeout: "A correção automática não foi concluída a tempo. A equipe foi avisada e pode reprocessar sua entrega.",
  service_error: "Houve uma falha técnica na correção automática. A equipe foi avisada e pode reprocessar sua entrega.",
  storage_error: "Não foi possível acessar o arquivo enviado. A equipe foi avisada e pode reprocessar sua entrega.",
};
export const issueMessage = (code?: string) => (code && ISSUE_MESSAGES[code]) || ISSUE_MESSAGES["service_error"]!;

type RawCriterion = { criterion?: unknown; description?: unknown; weight?: unknown };
/**
 * Accepts only a usable teacher rubric: at least one criterion, unique non-empty names, positive weights.
 * Criteria without explicit weights count equally — the platform's existing average rule.
 */
export function validateRubric(activity: Pick<Activity, "id" | "title" | "rubric" | "demandBody" | "demandHtml">, programId: string):
  { ok: true; snapshot: RubricSnapshot } | { ok: false; reason: string } {
  const raw = (Array.isArray(activity.rubric) ? activity.rubric : []) as RawCriterion[];
  if (!raw.length) return { ok: false, reason: "Atividade sem critérios de rubrica cadastrados." };
  if (!(activity.demandBody?.trim() || activity.demandHtml?.trim())) return { ok: false, reason: "Atividade sem enunciado da demanda." };
  const criteria: RubricItem[] = [];
  for (const r of raw) {
    const name = typeof r.criterion === "string" ? r.criterion.trim() : "";
    if (!name) return { ok: false, reason: "Há critério de rubrica sem nome." };
    if (criteria.some(c => c.criterion.toLowerCase() === name.toLowerCase())) return { ok: false, reason: `Critério duplicado: ${name}.` };
    const weight = r.weight === undefined ? 1 : Number(r.weight);
    if (!Number.isFinite(weight) || weight <= 0) return { ok: false, reason: `Peso inválido no critério ${name}.` };
    criteria.push({ criterion: name, description: typeof r.description === "string" ? r.description.trim() : "", weight });
  }
  return { ok: true, snapshot: { programId, activityId: activity.id, activityTitle: activity.title, criteria } };
}

/** Weighted mean on the 0–10 scale, computed by the server (never trusted from the model). */
export function overallScore(criteria: Pick<AiCriterion, "criterion" | "score">[], rubric: RubricItem[]) {
  let sum = 0, weights = 0;
  for (const r of rubric) {
    const c = criteria.find(x => x.criterion === r.criterion);
    if (!c) throw new Error(`missing criterion ${r.criterion}`);
    sum += c.score * r.weight; weights += r.weight;
  }
  return Math.round((sum / weights) * 100) / 100;
}

/** Strict JSON schema sent to the model; criterion names are an enum of the rubric being applied. */
export function outputSchema(rubric: RubricItem[]) {
  const text = { type: "string" };
  return {
    type: "object", additionalProperties: false,
    required: ["evaluable", "notEvaluableReason", "injectionAttempt", "criteria", "overallFeedback", "ethicsNote"],
    properties: {
      evaluable: { type: "boolean" },
      notEvaluableReason: text,
      injectionAttempt: { type: "boolean" },
      criteria: {
        type: "array", minItems: rubric.length, maxItems: rubric.length,
        items: {
          type: "object", additionalProperties: false,
          required: ["criterion", "score", "comment", "strengths", "improvements"],
          properties: {
            criterion: { type: "string", enum: rubric.map(r => r.criterion) },
            score: { type: "number", minimum: 0, maximum: 10 },
            comment: text,
            strengths: { type: "array", items: text, maxItems: 4 },
            improvements: { type: "array", items: text, maxItems: 4 },
          },
        },
      },
      overallFeedback: text,
      ethicsNote: text,
    },
  } as const;
}

const modelOutput = z.object({
  evaluable: z.boolean(),
  notEvaluableReason: z.string().max(2000),
  injectionAttempt: z.boolean(),
  criteria: z.array(z.object({
    criterion: z.string().min(1),
    score: z.number().finite(),
    comment: z.string().trim().min(1).max(4000),
    strengths: z.array(z.string().trim().min(1).max(800)).max(4),
    improvements: z.array(z.string().trim().min(1).max(800)).max(4),
  })),
  overallFeedback: z.string().max(6000),
  ethicsNote: z.string().max(3000),
});

export type ParsedEvaluation =
  | { ok: true; criteria: AiCriterion[]; overallScore: number; overallFeedback: string; ethicsNote: string; injectionAttempt: boolean }
  | { ok: false; code: "invalid_output" | "not_evaluable"; detail: string };

/** Validates the model's JSON against the applied rubric: every criterion exactly once, scores within 0–10. */
export function parseEvaluation(raw: string, rubric: RubricItem[]): ParsedEvaluation {
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return { ok: false, code: "invalid_output", detail: "JSON inválido" }; }
  const parsed = modelOutput.safeParse(json);
  if (!parsed.success) return { ok: false, code: "invalid_output", detail: "Estrutura fora do esquema" };
  const v = parsed.data;
  if (!v.evaluable) return { ok: false, code: "not_evaluable", detail: v.notEvaluableReason.slice(0, 500) || "Sem motivo" };
  const names = rubric.map(r => r.criterion);
  if (v.criteria.length !== names.length) return { ok: false, code: "invalid_output", detail: "Quantidade de critérios divergente" };
  const seen = new Set<string>();
  for (const c of v.criteria) {
    if (!names.includes(c.criterion)) return { ok: false, code: "invalid_output", detail: "Critério inexistente na rubrica" };
    if (seen.has(c.criterion)) return { ok: false, code: "invalid_output", detail: "Critério repetido" };
    seen.add(c.criterion);
    if (c.score < 0 || c.score > 10) return { ok: false, code: "invalid_output", detail: "Nota fora da escala" };
  }
  if (!v.overallFeedback.trim()) return { ok: false, code: "invalid_output", detail: "Síntese ausente" };
  const criteria = names.map(n => {
    const c = v.criteria.find(x => x.criterion === n)!;
    return { ...c, score: Math.round(c.score * 10) / 10 };
  });
  return { ok: true, criteria, overallScore: overallScore(criteria, rubric), overallFeedback: v.overallFeedback.trim(), ethicsNote: v.ethicsNote.trim(), injectionAttempt: v.injectionAttempt };
}

/** Terminal states stop polling; the rest are still moving through the queue. */
export const isTerminal = (s: AiStatus) => s === "completed" || s === "failed" || s === "needs_human_review";

/** Delay before an automatic retry after a transient failure (1 min, then 5 min). */
export const retryDelayMs = (tries: number) => (tries <= 1 ? 60_000 : 300_000);

/**
 * One-line status for lists. Automated and human results are both named by source;
 * no rule here decides which one prevails.
 */
export function deliveryStatusLabel(sub: { grades?: { score: number }[]; ai?: Pick<AiEvaluation, "status" | "overallScore"> }, fmt: (n: number) => string) {
  const human = sub.grades?.length ? sub.grades.reduce((t, g) => t + g.score, 0) / sub.grades.length : null;
  const ai = sub.ai?.status === "completed" && sub.ai.overallScore !== undefined ? sub.ai.overallScore : null;
  const parts: string[] = [];
  if (ai !== null) parts.push(`nota ${fmt(ai)} (IA)`);
  if (human !== null) parts.push(`revisão humana ${fmt(human)}`);
  if (parts.length) return `Corrigida · ${parts.join(" · ")}`;
  const s = sub.ai?.status;
  if (s === "pending" || s === "extracting" || s === "evaluating") return "Entregue · em correção";
  if (s === "needs_human_review" || s === "failed") return "Entregue · em análise pela equipe";
  return "Entregue · aguardando correção";
}
