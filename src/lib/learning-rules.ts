import { z } from "zod";
import type { Program, Submission } from "./store";

export const deliverySchema = z.object({
  programId: z.string().min(1).max(80), activityId: z.string().min(1).max(80),
  fileName: z.string().min(1).max(255).regex(/\.(docx?|pdf)$/i),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024),
  filePath: z.string().min(1).max(500), aiUse: z.string().max(1000),
});
export const gradingSchema = z.object({
  id: z.string().uuid(),
  grades: z.array(z.object({ criterion: z.string().min(1), score: z.number().min(0).max(10), comment: z.string().max(5000) })).min(1),
  teacherComment: z.string().max(10000),
});
/** Reviewer draft: a criterion without an explicit choice has score null — never a preset value. */
export type GradeDraft = { criterion: string; score: number | null; comment: string };
export function initialGradeDraft(rubric: { criterion: string }[], saved?: { criterion: string; score: number; comment: string }[]): GradeDraft[] {
  return rubric.map((r) => saved?.find((g) => g.criterion === r.criterion) ?? { criterion: r.criterion, score: null, comment: "" });
}
/** Criteria still without an explicit score; saving is allowed only when this is empty. */
export function unscoredCriteria(draft: GradeDraft[]): string[] {
  return draft.filter((g) => g.score === null || !Number.isFinite(g.score)).map((g) => g.criterion);
}
/** What the delivery upload actually accepts (mirrors deliverySchema and the file input). */
export const UPLOAD_RULES_LABEL = "PDF, DOC ou DOCX · até 10 MB";
/** An uploaded file must become a delivery within this window; older unlinked files are orphans. */
export const DELIVERY_FILE_MAX_AGE_MINUTES = 30;
/** Cleanup only touches unlinked files older than this (database floor is also 60). Must exceed the delivery window. */
export const ORPHAN_FILE_MIN_AGE_MINUTES = 60;
export function isFreshUpload(createdAt: string | undefined | null, now = Date.now()) {
  const t = createdAt ? Date.parse(createdAt) : NaN;
  return Number.isFinite(t) && now - t <= DELIVERY_FILE_MAX_AGE_MINUTES * 60_000;
}
/** Never removes a path linked to a registered delivery, whatever the candidate list says. */
export function selectRemovableOrphans(candidates: string[], linkedPaths: string[]) {
  const linked = new Set(linkedPaths);
  return [...new Set(candidates)].filter(p => !linked.has(p));
}
/** Pedagogical page guidance carried in the activity hint (e.g. "até 5 páginas"); not an automatic check. */
export function pageGuidance(hint: string | undefined): string | null {
  const m = hint?.match(/até\s+(\d+)\s+páginas?/i);
  return m ? `Orientação do exercício: até ${m[1]} ${m[1] === "1" ? "página" : "páginas"}.` : null;
}
/** Max registered deliveries per student + program + activity (enforced by the database trigger). */
export const MAX_ATTEMPTS = 2;
export const ATTEMPT_LIMIT_MESSAGE = "Limite de 2 tentativas atingido para esta atividade.";
export function attemptStatus(submissions: Pick<Submission, "programId" | "activityId">[], programId: string, activityId: string) {
  const used = submissions.filter(s => s.programId === programId && s.activityId === activityId).length;
  return { used, max: MAX_ATTEMPTS, left: Math.max(0, MAX_ATTEMPTS - used), reached: used >= MAX_ATTEMPTS };
}
/** Recognizes the database's attempt-limit rejection (hint first, message as fallback). */
export function isAttemptLimitError(error: { hint?: string | null; message?: string | null } | null | undefined) {
  return Boolean(error && (error.hint === "learning_attempt_limit" || /limite de 2 tentativas/i.test(error.message ?? "")));
}
export function currentSubmission(submissions: Submission[], programId: string, activityId: string) {
  return submissions.filter(s => s.programId === programId && s.activityId === activityId)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).at(-1);
}
/** True while ANY delivery of this activity has a requested, unfinished human review — not only the newest one. */
export function activityReviewPending(submissions: Pick<Submission, "programId" | "activityId" | "humanReviews" | "reviewedAt">[], programId: string, activityId: string) {
  return submissions.some(s => s.programId === programId && s.activityId === activityId && (s.humanReviews?.length ?? 0) > 0 && !s.reviewedAt);
}
/** Answer key, reference models and feedback video: open after a delivery, closed while any review of the activity is pending. */
export function answerKeyOpen(submissions: Pick<Submission, "programId" | "activityId" | "humanReviews" | "reviewedAt">[], programId: string, activityId: string) {
  return submissions.some(s => s.programId === programId && s.activityId === activityId) && !activityReviewPending(submissions, programId, activityId);
}
export function canOpenActivity(program: Program, submissions: Submission[], index: number) {
  const previous = program.activities[index - 1];
  return index === 0 || Boolean(previous && currentSubmission(submissions, program.id, previous.id));
}
export function learningProgress(program: Program, submissions: Submission[]) {
  const done = program.activities.filter(a => currentSubmission(submissions, program.id, a.id)).length;
  const next = program.activities.findIndex(a => !currentSubmission(submissions, program.id, a.id));
  return { done, total: program.activities.length, next: next < 0 ? Math.max(0, program.activities.length - 1) : next };
}/** Minimum final grade for an activity to count as approved on the certificate. It never locks later activities. */
export const MIN_PASS_SCORE = 5;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
type Graded = Pick<Submission, "grades"> & { ai?: { status: string; overallScore?: number } };
/** The AI grade, when a completed evaluation exists. */
export function aiScore(s: Graded) {
  return s.ai?.status === "completed" && typeof s.ai.overallScore === "number" ? s.ai.overallScore : null;
}
/** Human review prevails over the AI grade; without it, the AI grade is the delivery's grade. */
export function finalScore(s: Graded) {
  const human = s.grades?.length ? mean(s.grades.map(g => g.score)) : null;
  return human ?? aiScore(s);
}
/** A human review may confirm or raise the AI grade, never lower it. Returns an error message, or null when allowed. */
export function humanGradeError(scores: number[], ai: number | null) {
  const human = mean(scores);
  if (ai === null || human === null) return null;
  if (human + 1e-6 >= ai) return null;
  return `A revisão humana não pode reduzir a nota da IA (${ai.toFixed(1).replace(".", ",")}). Ajuste os critérios para manter ou aumentar a nota.`;
}
/** Certificate standing for one activity: best final grade among the counted deliveries. */
export function activityStanding(submissions: (Graded & Pick<Submission, "programId" | "activityId">)[], programId: string, activityId: string) {
  const scores = submissions.filter(s => s.programId === programId && s.activityId === activityId).map(finalScore).filter((n): n is number => n !== null);
  if (!scores.length) return { score: null, passed: null as boolean | null };
  const best = Math.max(...scores);
  return { score: best, passed: best + 1e-6 >= MIN_PASS_SCORE };
}
