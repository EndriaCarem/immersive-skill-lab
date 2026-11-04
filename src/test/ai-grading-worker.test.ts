import { beforeEach, describe, expect, it, vi } from "vitest";

// Worker tests: the AI service and document reader are replaced; the queue/lease rules run for real
// against a small in-memory stand-in of the database.
const gateway = vi.hoisted(() => ({ generateResponse: vi.fn() }));
vi.mock("@lovable.dev/ai-gateway", async (orig) => ({ ...(await orig<typeof import("@lovable.dev/ai-gateway")>()), generateResponse: gateway.generateResponse }));
vi.mock("@/lib/document-text.server", () => ({
  extractDocument: async () => ({ ok: true, format: "docx", text: "Texto da peça do aluno ".repeat(40), chars: 900, truncated: false }),
}));

import { OperationFailedError } from "@lovable.dev/ai-gateway";
import { processEvaluations } from "@/lib/ai-grading.server";

type Row = Record<string, unknown> & { id: string; status: string; tries: number; lease_token: string | null };
const RUBRIC = [{ criterion: "Estrutura" }, { criterion: "Fundamentação" }, { criterion: "Pedidos" }];
const modelJson = (scores: number[]) => JSON.stringify({
  evaluable: true, notEvaluableReason: "", injectionAttempt: false, overallFeedback: "Boa peça, com pontos a desenvolver.", ethicsNote: "",
  criteria: RUBRIC.map((r, i) => ({ criterion: r.criterion, score: scores[i], comment: "Comentário específico.", strengths: [], improvements: [] })),
});
const answer = (scores: number[]) => ({ id: "resp_1", output: [{ type: "message", content: [{ type: "output_text", text: modelJson(scores) }] }] });

function fakeDb(row: Row) {
  const writes: Record<string, unknown>[] = [];
  const claim = () => {
    if (row.status !== "pending" || row.tries >= 3) return [];
    Object.assign(row, { status: "extracting", tries: row.tries + 1, lease_token: crypto.randomUUID(), issue_code: null });
    return [{ ...row }];
  };
  const table = (name: string) => {
    let patch: Record<string, unknown> | null = null;
    const filters: Record<string, unknown> = {};
    const result = () => {
      if (name === "learning_ai_job_state") return { data: { paused_reason: null }, error: null };
      if (name === "learning_submissions") return { data: { file_path: "u/p1/f.docx", file_name: "peca.docx", ai_use: "Não usei" }, error: null };
      if (name === "learning_programs") return { data: { content: { id: "p1", activities: [{ id: "a1", title: "Atividade 1", demandBody: "Redija a manifestação.", rubric: RUBRIC }] } }, error: null };
      if (name === "learning_ai_evaluations" && patch) {
        if (filters["id"] !== row.id || filters["lease_token"] !== row.lease_token) return { data: [], error: null };
        Object.assign(row, patch); writes.push(patch);
        return { data: [{ id: row.id }], error: null };
      }
      return { data: null, error: null };
    };
    const q = {
      select: () => q, update: (p: Record<string, unknown>) => { patch = p; return q; },
      eq: (k: string, v: unknown) => { filters[k] = v; return q; },
      single: async () => result(), maybeSingle: async () => result(),
      then: (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, ko),
    };
    return q;
  };
  const db = {
    from: table,
    rpc: async () => ({ data: claim(), error: null }),
    storage: { from: () => ({ download: async () => ({ data: { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }, error: null }) }) },
  };
  return { db: db as never, writes };
}
const pending = (): Row => ({ id: "ev1", submission_id: "s1", program_id: "p1", activity_id: "a1", status: "pending", tries: 0, lease_token: null, lease_until: null });

describe("AI grading worker", () => {
  beforeEach(() => { gateway.generateResponse.mockReset(); });

  it("resumes a queued delivery later and publishes per-criterion scores without a new upload", async () => {
    gateway.generateResponse.mockResolvedValue(answer([6, 6, 9]));
    const row = pending();
    const { db } = fakeDb(row);
    expect(await processEvaluations(db, { limit: 1, only: row.id })).toEqual([{ id: "ev1", result: "completed" }]);
    expect(row.status).toBe("completed");
    expect(row["overall_score"]).toBe(7);
    expect((row["criteria"] as { score: number }[]).map(c => c.score)).toEqual([6, 6, 9]);
  });

  it("a real AI service failure leaves no score and does not complete the evaluation", async () => {
    gateway.generateResponse.mockImplementation(async () => { throw new OperationFailedError("upstream failed"); });
    const row = pending();
    const { db } = fakeDb(row);
    const [r] = await processEvaluations(db, { limit: 1, only: row.id });
    expect(r?.result).toBe("failed");
    expect(row.status).toBe("failed");
    expect(row["issue_code"]).toBe("service_error");
    expect(row["overall_score"]).toBeUndefined();
  });

  it("a worker whose lease was taken over cannot write a second grade", async () => {
    const row = pending();
    const { db, writes } = fakeDb(row);
    gateway.generateResponse.mockImplementation(async () => {
      // While the model answers, the lease expires and another run takes the row over.
      row.lease_token = "someone-else";
      return answer([8, 8, 8]);
    });
    const [r] = await processEvaluations(db, { limit: 1, only: row.id });
    expect(r?.result).toBe("lost_lease");
    expect(row["overall_score"]).toBeUndefined();
    expect(writes.some(w => w["status"] === "completed")).toBe(false);
  });

  it("an already completed delivery is never claimed again (no duplicate grade)", async () => {
    gateway.generateResponse.mockResolvedValue(answer([5, 5, 5]));
    const row = { ...pending(), status: "completed", tries: 1, overall_score: 8.1 };
    const { db } = fakeDb(row);
    expect(await processEvaluations(db, { limit: 1, only: row.id })).toEqual([]);
    expect(gateway.generateResponse).not.toHaveBeenCalled();
    expect(row.overall_score).toBe(8.1);
  });
});
