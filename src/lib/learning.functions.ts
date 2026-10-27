import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deliverySchema, gradingSchema } from "./learning-rules";
import type { Program, Submission } from "./store";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["learning_submissions"]["Row"];
function submission(row: Row, name?: string): Submission & { userId: string; filePath: string } {
  return { id: row.id, userId: row.user_id, student: name || row.user_id, programId: row.program_id,
    activityId: row.activity_id, fileName: row.file_name, fileSize: row.file_size, filePath: row.file_path,
    aiUse: row.ai_use, submittedAt: row.submitted_at, ...(row.grades ? { grades: gradingSchema.shape.grades.parse(row.grades) } : {}),
    ...(row.teacher_comment !== null ? { teacherComment: row.teacher_comment } : {}), humanReviews: z.array(z.string()).parse(row.human_reviews), reviewedAt: row.reviewed_at ?? undefined };
}
export const learnerData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [programs, subs, notes, enrollments] = await Promise.all([
    context.supabase.from("learning_programs").select("content"),
    context.supabase.from("learning_submissions").select("*").eq("user_id", context.userId).order("submitted_at"),
    context.supabase.from("learning_notes").select("*").eq("user_id", context.userId).order("created_at"),
    context.supabase.from("commerce_enrollments").select("*").eq("user_id", context.userId).eq("status", "active"),
  ]);
  for (const r of [programs, subs, notes, enrollments]) if (r.error) throw new Error("Não foi possível carregar seu progresso.");
  const active = (enrollments.data ?? []).filter(e => !e.expires_at || new Date(e.expires_at).getTime() > Date.now());
  return { programs: (programs.data ?? []).map(p => p.content as unknown as Program).filter(p => active.some(e => e.product_id === p.id)),
    submissions: (subs.data ?? []).map(s => submission(s)), notes: notes.data ?? [], enrollments: active };
});
export const deliverActivity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => deliverySchema.parse(x)).handler(async ({ data, context }) => {
    if (!data.filePath.startsWith(`${context.userId}/${data.programId}/`)) throw new Error("Arquivo inválido.");
    const parts = data.filePath.split("/"); const file = parts.pop();
    if (!file) throw new Error("Arquivo inválido.");
    const { data: files, error: listError } = await context.supabase.storage.from("learner-submissions").list(parts.join("/"), { search: file });
    const stored = files?.find(f => f.name === file);
    if (listError || !stored || Number(stored.metadata?.size) !== data.fileSize) throw new Error("O arquivo não foi recebido. Envie novamente.");
    const { data: row, error } = await context.supabase.from("learning_submissions").insert({
      user_id: context.userId, program_id: data.programId, activity_id: data.activityId, file_name: data.fileName,
      file_size: data.fileSize, file_path: data.filePath, ai_use: data.aiUse,
    }).select("*").single();
    if (error || !row) throw new Error(error?.message || "Não foi possível salvar a entrega.");
    return submission(row);
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
  const [programs, subs, profiles, enrollments] = await Promise.all([
    context.supabase.from("learning_programs").select("content"), context.supabase.from("learning_submissions").select("*").order("submitted_at"),
    context.supabase.from("profiles").select("id,full_name"), context.supabase.from("commerce_enrollments").select("*"),
  ]);
  for (const r of [programs, subs, profiles, enrollments]) if (r.error) throw new Error("Não foi possível carregar as entregas.");
  return { programs: (programs.data ?? []).map(p => p.content as unknown as Program),
    submissions: (subs.data ?? []).map(s => submission(s, profiles.data?.find(p => p.id === s.user_id)?.full_name)),
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