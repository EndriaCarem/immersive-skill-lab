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
    draft[0].score = 8;
    draft[1].score = 0;
    expect(unscoredCriteria(draft)).toEqual(["Pedidos"]);
    draft[2].score = 7;
    expect(unscoredCriteria(draft)).toEqual([]);
  });
  it("correção já salva reabre com as notas gravadas", () => {
    const draft = initialGradeDraft(rubric, [{ criterion: "Estrutura", score: 9, comment: "ok" }]);
    expect(draft[0]).toEqual({ criterion: "Estrutura", score: 9, comment: "ok" });
    expect(unscoredCriteria(draft)).toEqual(["Fundamentação", "Pedidos"]);
  });
});
