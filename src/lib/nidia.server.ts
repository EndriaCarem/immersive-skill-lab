import { generateResponse, GatewayError, PaymentRequiredError, PermissionDeniedError, RateLimitError } from "@lovable.dev/ai-gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { Program } from "./store";
import { MAX_ANSWER_CHARS, NIDIA_INSTRUCTIONS, NIDIA_MODEL, NIDIA_PROMPT_VERSION, NIDIA_TIMEOUT_MS, fenceQuestion, nidiaContext } from "./nidia-rules";

type Db = SupabaseClient<Database>;
/** Technical log line: identifiers, codes and timings only — never the question or answer text. */
const log = (event: string, fields: Record<string, unknown>) => console.info(JSON.stringify({ scope: "nidia", event, ...fields }));

function outputText(response: unknown): string | null {
  const r = response as { output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
  for (const item of r.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) if (part.type === "output_text" && part.text?.trim()) return part.text.trim();
  }
  return null;
}

/**
 * Answers one reserved question. Called only after reserve_learning_assistant_question succeeded for the caller,
 * so enrollment, progression, enablement and quota were already checked under a database lock.
 * Writes go through the service role and only while the row is still pending.
 */
export async function answerQuestion(db: Db, questionId: string) {
  const started = Date.now();
  const q = await db.from("learning_assistant_questions").select("*").eq("id", questionId).eq("status", "pending").single();
  if (q.error || !q.data) throw Object.assign(new Error("nidia:service"), { code: "service" });
  const row = q.data;
  const fail = async (code: string) => {
    await db.from("learning_assistant_questions").update({ status: "failed", issue_code: code }).eq("id", row.id).eq("status", "pending");
    log("failed", { question: row.id, code, ms: Date.now() - started });
    return { ok: false as const, code: code === "paused" ? "paused" : "service" };
  };

  const [prog, staff, materials, settings, history] = await Promise.all([
    db.from("learning_programs").select("content").eq("id", row.program_id).single(),
    db.from("learning_activity_staff").select("mail_subject, mail_html, supervisor_id").eq("program_id", row.program_id).eq("activity_id", row.activity_id).maybeSingle(),
    db.from("learning_activity_materials").select("title, doc_type, description, category").eq("program_id", row.program_id).eq("activity_id", row.activity_id).order("position"),
    db.from("learning_assistant_settings").select("teacher_guidance").eq("program_id", row.program_id).eq("activity_id", row.activity_id).maybeSingle(),
    db.from("learning_assistant_questions").select("question, answer").eq("user_id", row.user_id).eq("program_id", row.program_id).eq("activity_id", row.activity_id).eq("status", "answered").order("created_at").limit(5),
  ]);
  const program = prog.data?.content as unknown as Program | undefined;
  const index = program?.activities?.findIndex((a) => a.id === row.activity_id) ?? -1;
  const activity = index >= 0 ? program!.activities[index] : undefined;
  if (!program || !activity) return fail("context_missing");
  let from: string | null = null;
  if (staff.data?.supervisor_id) {
    const p = await db.from("learning_professionals").select("full_name").eq("id", staff.data.supervisor_id).maybeSingle();
    from = p.data?.full_name ?? null;
  }
  const context = nidiaContext({
    program, activity, index,
    mail: { subject: staff.data?.mail_subject, html: staff.data?.mail_html, from },
    materials: (materials.data ?? []).map((m) => ({ title: m.title, docType: m.doc_type, description: m.description, category: m.category })),
    teacherGuidance: settings.data?.teacher_guidance,
  });
  const turns = (history.data ?? []).flatMap((h) => [
    { role: "user" as const, content: `<<<PERGUNTA_DO_ALUNO>>>\n${fenceQuestion(h.question)}\n<<<FIM_PERGUNTA>>>` },
    { role: "assistant" as const, content: h.answer ?? "" },
  ]);

  let response;
  try {
    response = await generateResponse({
      model: NIDIA_MODEL,
      instructions: NIDIA_INSTRUCTIONS,
      input: [
        { role: "developer", content: `<<<CONTEXTO_DA_ATIVIDADE>>>\n${context}\n<<<FIM_CONTEXTO>>>` },
        ...turns,
        { role: "user", content: `<<<PERGUNTA_DO_ALUNO>>>\n${fenceQuestion(row.question)}\n<<<FIM_PERGUNTA>>>` },
      ],
      reasoning: { effort: "low" },
      max_output_tokens: 1500,
    }, { signal: AbortSignal.timeout(NIDIA_TIMEOUT_MS), runId: row.id, metadata: { scope: "nidia", question_id: row.id, prompt_version: NIDIA_PROMPT_VERSION } });
  } catch (e) {
    log("model_error", { question: row.id, code: e instanceof GatewayError ? e.code : e instanceof Error ? e.name : "app_error", status: e instanceof GatewayError ? e.httpStatus : undefined });
    if (e instanceof PaymentRequiredError || e instanceof PermissionDeniedError || e instanceof RateLimitError) return fail("paused");
    return fail("service_error");
  }
  const text = outputText(response);
  if (!text) return fail("invalid_output");
  const answer = text.length > MAX_ANSWER_CHARS ? `${text.slice(0, MAX_ANSWER_CHARS - 1)}…` : text;
  const saved = await db.from("learning_assistant_questions").update({
    status: "answered", answer, answered_at: new Date().toISOString(), model: NIDIA_MODEL, prompt_version: NIDIA_PROMPT_VERSION,
    usage: ((response as { usage?: unknown }).usage ?? null) as Json, gateway_request_id: (response as { id?: string }).id ?? null,
  }).eq("id", row.id).eq("status", "pending").select("id, question, answer, answered_at").maybeSingle();
  if (saved.error || !saved.data) return fail("save_error");
  log("answered", { question: row.id, chars: answer.length, ms: Date.now() - started });
  return { ok: true as const, message: { id: saved.data.id, question: saved.data.question, answer: saved.data.answer ?? "", answeredAt: saved.data.answered_at ?? "" } };
}
