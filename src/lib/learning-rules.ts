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
/** What the delivery upload actually accepts (mirrors deliverySchema and the file input). */
export const UPLOAD_RULES_LABEL = "PDF, DOC ou DOCX · até 10 MB";
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
}