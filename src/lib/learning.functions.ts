import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ATTEMPT_LIMIT_MESSAGE, MAX_ATTEMPTS, answerKeyOpen, deliverySchema, gradingSchema, isAttemptLimitError } from "./learning-rules";
import type { Program, Submission } from "./store";
import type { AiEvaluation, AiStatus } from "./ai-grading-rules";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveActivityStaff, visiblePeople } from "./professionals";

/** Faculty for the learner's courses. Failures leave staff empty instead of blocking progress. */
async function loadStaff(db: SupabaseClient<Database>, programIds: string[]) {
  const empty = { links: [] as Database["public"]["Tables"]["learning_course_professionals"]["Row"][], rows: [] as Database["public"]["Tables"]["learning_activity_staff"]["Row"][], people: visiblePeople([], new Map()) };
  if (!programIds.length) return empty;
  const [links, rows, people] = await Promise.all([
    db.from("learning_course_professionals").select("*").in("program_id", programIds),
    db.from("learning_activity_staff").select("*").in("program_id", programIds),
    db.from("learning_professionals").select("id, full_name, title, specialty, bio, photo_path, active, display_authorized").eq("active", true).eq("display_authorized", true),
  ]);
  if (links.error || rows.error || people.error) return empty;
  const paths = (people.data ?? []).map(p => p.photo_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const signed = await db.storage.from("professional-photos").createSignedUrls(paths, 3600);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return { links: links.data ?? [], rows: rows.data ?? [], people: visiblePeople(people.data ?? [], urls) };
}

type Row = Database["public"]["Tables"]["learning_submissions"]["Row"];
type EvalRow = Pick<Database["public"]["Tables"]["learning_ai_evaluations"]["Row"], "id" | "submission_id" | "status" | "issue_code" | "overall_score" | "overall_feedback" | "ethics_note" | "criteria" | "model" | "completed_at">;
const EVAL_COLUMNS = "id, submission_id, status, issue_code, overall_score, overall_feedback, ethics_note, criteria, model, completed_at";
/** Only completed rows carry scores; any other state is shown as status, never as a grade. */
function evaluation(row: EvalRow): AiEvaluation {
  const done = row.status === "completed";
  const criteria = done ? z.array(z.object({ criterion: z.string(), score: z.number(), comment: z.string(), strengths: z.array(z.string()), improvements: z.array(z.string()) })).safeParse(row.criteria) : null;
  return { id: row.id, submissionId: row.submission_id, status: row.status as AiStatus, ...(row.issue_code ? { issueCode: row.issue_code } : {}),
    ...(done && row.overall_score !== null && criteria?.success ? { overallScore: Number(row.overall_score), criteria: criteria.data } : {}),
    ...(done && row.overall_feedback ? { overallFeedback: row.overall_feedback } : {}), ...(done && row.ethics_note ? { ethicsNote: row.ethics_note } : {}),
    ...(row.model ? { model: row.model } : {}), ...(row.completed_at ? { completedAt: row.completed_at } : {}) };
}
function submission(row: Row, name?: string, ai?: EvalRow): Submission & { userId: string; filePath: string } {
  return { id: row.id, userId: row.user_id, student: name || row.user_id, programId: row.program_id,
    activityId: row.activity_id, fileName: row.file_name, fileSize: row.file_size, filePath: row.file_path,
    aiUse: row.ai_use, submittedAt: row.submitted_at, ...(row.grades ? { grades: gradingSchema.shape.grades.parse(row.grades) } : {}),
    ...(row.teacher_comment !== null ? { teacherComment: row.teacher_comment } : {}), humanReviews: z.array(z.string()).parse(row.human_reviews), reviewedAt: row.reviewed_at ?? undefined,
    ...(row.attempt !== null ? { attempt: row.attempt } : {}), ...(ai ? { ai: evaluation(ai) } : {}) };
}
export const learnerData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [programs, subs, notes, enrollments, answers, evals] = await Promise.all([
    context.supabase.from("learning_programs").select("content"),
    context.supabase.from("learning_submissions").select("*").eq("user_id", context.userId).order("submitted_at"),
    context.supabase.from("learning_notes").select("*").eq("user_id", context.userId).order("created_at"),
    context.supabase.from("commerce_enrollments").select("*").eq("user_id", context.userId).eq("status", "active"),
    context.supabase.from("learning_answers").select("*"),
    context.supabase.from("learning_ai_evaluations").select(EVAL_COLUMNS).eq("user_id", context.userId),
  ]);
  for (const r of [programs, subs, notes, enrollments, answers, evals]) if (r.error) throw new Error("Não foi possível carregar seu progresso.");
  const active = (enrollments.data ?? []).filter(e => !e.expires_at || new Date(e.expires_at).getTime() > Date.now());
  const staff = await loadStaff(context.supabase, active.map(e => e.product_id));
  return { programs: (programs.data ?? []).map(p => p.content as unknown as Program).filter(p => active.some(e => e.product_id === p.id)).map(p => ({ ...p, activities: p.activities.map(a => {
    const open = answerKeyOpen((subs.data ?? []).map(s => ({ programId: s.program_id, activityId: s.activity_id, humanReviews: Array.isArray(s.human_reviews) ? (s.human_reviews as string[]) : [], reviewedAt: s.reviewed_at ?? undefined })), p.id, a.id);
    const answer = answers.data?.find(r => r.program_id === p.id && r.activity_id === a.id)?.content;
    const withStaff = { ...a, staff: resolveActivityStaff(staff.links.filter(l => l.program_id === p.id), staff.rows.find(r => r.program_id === p.id && r.activity_id === a.id), staff.people) };
    return open && answer ? { ...withStaff, ...(answer as unknown as Partial<typeof a>) } : { ...withStaff, answerHtml: "", answerIntro: "", answerVideoUrl: "", answerFiles: [], guideDocs: [], referenceDoc: { name: "", content: "", description: "" } };
  }) })),
    submissions: (subs.data ?? []).map(s => submission(s, undefined, evals.data?.find(e => e.submission_id === s.id))), notes: notes.data ?? [], enrollments: active };
});
/**
 * Lets the learner's open feedback page start grading of their own queued delivery right away.
 * Ownership is checked through RLS; the lease in the database prevents duplicate processing.
 */
export const runMyEvaluation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => z.object({ submissionId: z.string().uuid() }).parse(x)).handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("learning_ai_evaluations").select("id, status, user_id").eq("submission_id", data.submissionId).maybeSingle();
    if (error || !row || row.user_id !== context.userId) throw new Error("Entrega não encontrada.");
    if (row.status === "completed" || row.status === "failed" || row.status === "needs_human_review") return { status: row.status };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { processEvaluations } = await import("./ai-grading.server");
    const [result] = await processEvaluations(supabaseAdmin, { limit: 1, only: row.id });
    return { status: result?.result ?? row.status };
  });
export const requeueAiEvaluation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => z.object({ id: z.string().uuid() }).parse(x)).handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("requeue_learning_ai_evaluation", { p_evaluation: data.id });
    if (error) throw new Error(error.message);
    return true;
  });
export const deliverActivity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => deliverySchema.parse(x)).handler(async ({ data, context }) => {
    if (!data.filePath.startsWith(`${context.userId}/${data.programId}/`)) throw new Error("Arquivo inválido.");
    const parts = data.filePath.split("/"); const file = parts.pop();
    if (!file) throw new Error("Arquivo inválido.");
    const storage = context.supabase.storage.from("learner-submissions");
    const discard = async () => { await storage.remove([data.filePath]); };
    // Friendly early answer; the database trigger is the authoritative, concurrency-safe check.
    const { count, error: countError } = await context.supabase.from("learning_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId).eq("program_id", data.programId).eq("activity_id", data.activityId);
    if (countError) throw new Error("Não foi possível verificar suas tentativas. Tente novamente.");
    if ((count ?? 0) >= MAX_ATTEMPTS) { await discard(); throw new Error(ATTEMPT_LIMIT_MESSAGE); }
    const { data: files, error: listError } = await storage.list(parts.join("/"), { search: file });
    const stored = files?.find(f => f.name === file);
    if (listError || !stored || Number(stored.metadata?.size) !== data.fileSize) { await discard(); throw new Error("O arquivo não foi recebido. Envie novamente."); }
    const { data: row, error } = await context.supabase.from("learning_submissions").insert({
      user_id: context.userId, program_id: data.programId, activity_id: data.activityId, file_name: data.fileName,
      file_size: data.fileSize, file_path: data.filePath, ai_use: data.aiUse,
    }).select("*").single();
    if (error || !row) {
      await discard();
      if (isAttemptLimitError(error)) throw new Error(ATTEMPT_LIMIT_MESSAGE);
      throw new Error(error?.message || "Não foi possível salvar a entrega.");
    }
    return { ...submission(row), attempt: row.attempt ?? (count ?? 0) + 1, maxAttempts: MAX_ATTEMPTS };
  });
export const addLearningNote = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => z.object({ programId: z.string(), activityId: z.string(), text: z.string().trim().min(1).max(10000) }).parse(x))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("learning_programs").select("content").eq("id", data.programId).single();
    const program = p?.content as unknown as Program | undefined;
    if (!program?.activities.some(a => a.id === data.activityId)) throw new Error("Atividade inválida.");
    const { error } = await context.supabase.from("learning_notes").insert({ user_id: context.userId, program_id: data.programId, activity_id: data.activityId, text: data.text });
    if (error) throw new Error("Não foi possível salvar a anotação.");
    return true;
  });
export const requestLearningReview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => z.object({ id: z.string().uuid() }).parse(x)).handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("request_learning_review", { p_submission: data.id });
    if (error) throw new Error(error.message);
    return true;
  });
export const adminLearningData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Error("Acesso restrito à administração.");
  const [programs, subs, profiles, enrollments, answers, evals, job] = await Promise.all([
    context.supabase.from("learning_programs").select("content"), context.supabase.from("learning_submissions").select("*").order("submitted_at"),
    context.supabase.from("profiles").select("id,full_name"), context.supabase.from("commerce_enrollments").select("*"),
    context.supabase.from("learning_answers").select("*"), context.supabase.from("learning_ai_evaluations").select(EVAL_COLUMNS),
    context.supabase.from("learning_ai_job_state").select("paused_reason, paused_at").eq("id", "grading").maybeSingle(),
  ]);
  for (const r of [programs, subs, profiles, enrollments, answers, evals]) if (r.error) throw new Error("Não foi possível carregar as entregas.");
  return { programs: (programs.data ?? []).map(p => p.content as unknown as Program).map(p => ({ ...p, activities: p.activities.map(a => ({ ...a, ...(answers.data?.find(r => r.program_id === p.id && r.activity_id === a.id)?.content as unknown as Partial<typeof a> ?? {}) })) })),
    submissions: (subs.data ?? []).map(s => submission(s, profiles.data?.find(p => p.id === s.user_id)?.full_name, evals.data?.find(e => e.submission_id === s.id))),
    aiPaused: job.data?.paused_reason ?? null,
    enrollments: (enrollments.data ?? []).map(e => ({ programId: e.product_id, student: profiles.data?.find(p => p.id === e.user_id)?.full_name || e.user_id, userId: e.user_id, enrolledAt: e.enrolled_at })) };
});
export const gradeLearningSubmission = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => gradingSchema.parse(x)).handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!allowed) throw new Error("Acesso restrito à administração.");
    const { data: row, error } = await context.supabase.from("learning_submissions").update({ grades: data.grades,
      teacher_comment: data.teacherComment, reviewer_id: context.userId, reviewed_at: new Date().toISOString(),
    }).eq("id", data.id).select("*").single();
    if (error || !row) throw new Error("Não foi possível salvar a correção.");
    return submission(row);
  });
export const learningFileUrl = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => z.object({ id: z.string().uuid() }).parse(x)).handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("learning_submissions").select("file_path").eq("id", data.id).single();
    if (!row) throw new Error("Entrega não encontrada.");
    const { data: link, error } = await context.supabase.storage.from("learner-submissions").createSignedUrl(row.file_path, 300);
    if (error || !link) throw new Error("Não foi possível abrir o arquivo.");
    const url = new URL(link.signedUrl); const browserBase = import.meta.env['VITE_SUPABASE_URL'];
    if (!browserBase) throw new Error("Armazenamento indisponível.");
    return new URL(url.pathname + url.search, browserBase).href;
  });