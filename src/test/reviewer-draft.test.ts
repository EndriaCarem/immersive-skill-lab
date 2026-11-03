import { describe, expect, it } from "vitest";
import { initialGradeDraft, unscoredCriteria } from "@/lib/learning-rules";

const rubric = [{ criterion: "Estrutura" }, { criterion: "Fundamentação" }, { criterion: "Pedidos" }];

describe("formulário do revisor", () => {
  it("nenhum critério começa com nota predefinida", () => {
    const draft = initialGradeDraft(rubric);
    expect(draft.every((g) => g.score === null)).toBe(true);
    expect(unscoredCriteria(draft)).toEqual(["Estrutura", "Fundamentação", "Pedidos"]);
  });
  it("só libera salvar quando todos os critérios recebem nota explícita", () => {
    const draft = initialGradeDraft(rubric);
    const scoreAt = (i: number, score: number) => draft.map((g, j) => (j === i ? { ...g, score } : g));
    const partial = scoreAt(0, 8).map((g, j) => (j === 1 ? { ...g, score: 0 } : g));
    expect(unscoredCriteria(partial)).toEqual(["Pedidos"]);
    const full = partial.map((g, j) => (j === 2 ? { ...g, score: 7 } : g));
    expect(unscoredCriteria(full)).toEqual([]);
  });
  it("correção já salva reabre com as notas gravadas", () => {
    const draft = initialGradeDraft(rubric, [{ criterion: "Estrutura", score: 9, comment: "ok" }]);
    expect(draft[0]).toEqual({ criterion: "Estrutura", score: 9, comment: "ok" });
    expect(unscoredCriteria(draft)).toEqual(["Fundamentação", "Pedidos"]);
  });
});
