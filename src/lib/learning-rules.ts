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
export function currentSubmission(submissions: Submission[], programId: string, activityId: string) {
  return submissions.filter(s => s.programId === programId && s.activityId === activityId)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).at(-1);
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