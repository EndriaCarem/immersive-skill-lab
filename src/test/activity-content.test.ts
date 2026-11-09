import { describe, expect, it } from "vitest";
import { rubricCriteriaSchema } from "@/lib/activity-content";
import { overallScore, validateRubric } from "@/lib/ai-grading-rules";

describe("teacher rubric editing", () => {
  const criteria = [{ criterion: "Fundamentação", description: "Avaliar coerência jurídica e estratégias válidas.", weight: 3 }, { criterion: "Clareza", description: "Avaliar organização e redação.", weight: 1 }];
  it("persists descriptions and uses relative weights in the real grading calculation", () => {
    const saved = rubricCriteriaSchema.parse(criteria);
    const rubric = validateRubric({ id: "a1", title: "Demanda", demandBody: "Elabore o parecer.", rubric: saved }, "p1");
    expect(rubric.ok && rubric.snapshot.criteria).toEqual(criteria);
    expect(overallScore([{ criterion: "Fundamentação", score: 8 }, { criterion: "Clareza", score: 4 }], saved)).toBe(7);
  });
  it("requires a teacher description for every newly saved criterion", () => {
    expect(rubricCriteriaSchema.safeParse([{ ...criteria[0], description: " " }]).success).toBe(false);
  });
  it("rejects zero or negative weights", () => {
    for (const weight of [0, -1]) expect(rubricCriteriaSchema.safeParse([{ ...criteria[0], weight }]).success).toBe(false);
  });
  it("rejects repeated criterion names", () => {
    expect(rubricCriteriaSchema.safeParse([criteria[0], { ...criteria[1], criterion: "fundamentação" }]).success).toBe(false);
  });
});