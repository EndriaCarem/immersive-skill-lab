import { beforeEach, describe, expect, it, vi } from "vitest";

const generateResponse = vi.fn();
vi.mock("@lovable.dev/ai-gateway", () => {
  class GatewayError extends Error { code = "x"; httpStatus = 500; }
  class PaymentRequiredError extends GatewayError {}
  class PermissionDeniedError extends GatewayError {}
  class RateLimitError extends GatewayError {}
  return { generateResponse: (...a: unknown[]) => generateResponse(...a), GatewayError, PaymentRequiredError, PermissionDeniedError, RateLimitError };
});
import { answerQuestion } from "@/lib/nidia.server";

const program = { title: "Curso Simulado de Arbitragem", activities: [{ id: "a1", title: "Revisão de cláusula", caseParagraphs: ["Fatos"], caseNote: "", attachments: [], demandBody: "Analise", answerHtml: "<p>SEGREDO</p>", referenceDoc: { content: "SEGREDO" } }] };
type Update = { table: string; patch: Record<string, unknown> };

/** Minimal chainable stand-in for the service client: reads return fixtures, updates are recorded. */
function fakeDb(updates: Update[]) {
  const rows: Record<string, unknown> = {
    learning_assistant_questions: { id: "q1", user_id: "u1", program_id: "p1", activity_id: "a1", question: "O que devo entregar?", status: "pending" },
    learning_programs: { content: program },
  };
  return {
    from(table: string) {
      let patch: Record<string, unknown> | null = null;
      const result = () => {
        if (patch) { updates.push({ table, patch }); return { data: { id: "q1", question: "O que devo entregar?", answer: patch["answer"] ?? null, answered_at: "now" }, error: null }; }
        if (table === "learning_assistant_questions") return { data: rows[table], error: null };
        return { data: rows[table] ?? null, error: null };
      };
      const chain: Record<string, unknown> = {};
      for (const k of ["select", "eq", "order", "limit"]) chain[k] = () => chain;
      chain["update"] = (p: Record<string, unknown>) => { patch = p; return chain; };
      chain["single"] = async () => result();
      chain["maybeSingle"] = async () => result();
      chain["then"] = (res: (v: unknown) => unknown) => Promise.resolve(table === "learning_assistant_questions" && !patch ? { data: [], error: null } : patch ? (updates.push({ table, patch }), { data: null, error: null }) : { data: [], error: null }).then(res);
      return chain;
    },
  };
}

describe("Nidia service", () => {
  beforeEach(() => generateResponse.mockReset());

  it("marks the question failed (not consumed) when the AI service errors", async () => {
    generateResponse.mockRejectedValue(new Error("network down"));
    const updates: Update[] = [];
    const out = await answerQuestion(fakeDb(updates) as never, "q1");
    expect(out).toEqual({ ok: false, code: "service" });
    expect(updates.some((u) => u.patch["status"] === "failed")).toBe(true);
    expect(updates.some((u) => u.patch["status"] === "answered")).toBe(false);
  });

  it("stores the real answer and never sends the answer key to the model", async () => {
    generateResponse.mockResolvedValue({ id: "r1", output: [{ type: "message", content: [{ type: "output_text", text: "Comece pela cláusula 18." }] }] });
    const updates: Update[] = [];
    const out = await answerQuestion(fakeDb(updates) as never, "q1");
    expect(out.ok).toBe(true);
    expect(updates.find((u) => u.patch["status"] === "answered")?.patch["answer"]).toBe("Comece pela cláusula 18.");
    expect(JSON.stringify(generateResponse.mock.calls[0]?.[0])).not.toContain("SEGREDO");
  });

  it("treats an empty model output as a failure instead of inventing an answer", async () => {
    generateResponse.mockResolvedValue({ id: "r2", output: [] });
    const updates: Update[] = [];
    const out = await answerQuestion(fakeDb(updates) as never, "q1");
    expect(out.ok).toBe(false);
    expect(updates.some((u) => u.patch["status"] === "answered")).toBe(false);
  });
});
