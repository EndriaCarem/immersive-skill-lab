import { z } from "zod";
import { activityStanding, activityReviewPending } from "./learning-rules";
import type { Program, Submission } from "./store";

export function certificateStanding(program: Program, submissions: Submission[]) {
  const rows = program.activities.map(a => ({ activityId: a.id, title: a.title, ...activityStanding(submissions.filter(s => !s.voidedAt), program.id, a.id) }));
  const pending = program.activities.some(a => activityReviewPending(submissions.filter(s => !s.voidedAt), program.id, a.id));
  return { rows, eligible: rows.length > 0 && rows.every(r => r.passed === true) && !pending, pending };
}
export const signupSchema = z.object({
  email: z.string().trim().email().max(255), password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(100), termsId: z.string().uuid(), consent: z.literal(true),
  origin: z.string().url().max(300),
});
export const testAccessSchema = z.object({ enrollmentId: z.string().uuid(), confirmedTest: z.literal(true), reason: z.string().trim().min(5).max(500) });
export function sixMonthExpiry(start: string) {
  const d = new Date(start);
  if (!Number.isFinite(d.getTime())) throw new Error("Data inválida.");
  const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 6);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}