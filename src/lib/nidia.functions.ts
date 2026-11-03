import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { askSchema, nidiaCode, nidiaMessage, threadSchema, type NidiaThread } from "./nidia-rules";

/** Permission, quota and history come from the database for the authenticated caller; browser ids only select the room. */
async function thread(db: SupabaseClient<Database>, userId: string, programId: string, activityId: string): Promise<NidiaThread> {
  const [state, rows] = await Promise.all([
    db.rpc("learning_assistant_state", { p_program: programId, p_activity: activityId }).single(),
    db.from("learning_assistant_questions").select("id, question, answer, answered_at").eq("user_id", userId)
      .eq("program_id", programId).eq("activity_id", activityId).eq("status", "answered").order("created_at"),
  ]);
  if (state.error || !state.data || rows.error) throw new Error("Não foi possível carregar a conversa com a Nidia.");
  const s = state.data;
  const enrolled = s.reason !== "not_enrolled" && s.reason !== "auth" && s.reason !== "invalid_activity";
  return {
    available: s.available, reason: s.reason, limit: s.question_limit, used: s.used, pending: s.pending,
    messages: enrolled ? (rows.data ?? []).map((r) => ({ id: r.id, question: r.question, answer: r.answer ?? "", answeredAt: r.answered_at ?? "" })) : [],
  };
}

export const nidiaThread = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((x: unknown) => threadSchema.parse(x))
  .handler(async ({ data, context }) => thread(context.supabase, context.userId, data.programId, data.activityId));

export const askNidia = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((x: unknown) => askSchema.parse(x))
  .handler(async ({ data, context }) => {
    const reserved = await context.supabase.rpc("reserve_learning_assistant_question", { p_program: data.programId, p_activity: data.activityId, p_question: data.question });
    if (reserved.error || !reserved.data) throw new Error(nidiaMessage(nidiaCode(reserved.error?.message) ?? "service"));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { answerQuestion } = await import("./nidia.server");
    let result;
    try {
      result = await answerQuestion(supabaseAdmin, reserved.data);
    } catch {
      await supabaseAdmin.from("learning_assistant_questions").update({ status: "failed", issue_code: "unexpected" }).eq("id", reserved.data).eq("status", "pending");
      throw new Error(nidiaMessage("service"));
    }
    if (!result.ok) throw new Error(nidiaMessage(result.code));
    return { message: result.message, thread: await thread(context.supabase, context.userId, data.programId, data.activityId) };
  });
