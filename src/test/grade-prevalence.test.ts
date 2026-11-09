import { describe, expect, it } from "vitest";
import { MIN_PASS_SCORE, activityStanding, finalScore, humanGradeError } from "@/lib/learning-rules";
import { READ_FAILURE_CODES, issueMessage } from "@/lib/ai-grading-rules";

const ai = (overallScore: number) => ({ status: "completed", overallScore });
describe("human review prevails but never lowers the AI grade", () => {
  it("rejects a human mean below the AI grade", () => {
    expect(humanGradeError([6, 7, 7], 7)).toMatch(/não pode reduzir/);
  });
  it("accepts keeping or raising the AI grade", () => {
    expect(humanGradeError([7, 7, 7], 7)).toBeNull();
    expect(humanGradeError([9, 8, 9], 7)).toBeNull();
  });
  it("final grade is the human one when it exists", () => {
    expect(finalScore({ grades: [{ criterion: "a", score: 9, comment: "" }], ai: ai(7) })).toBe(9);
    expect(finalScore({ ai: ai(7) })).toBe(7);
  });
});
describe("minimum grade 5 for the certificate", () => {
  it("is 5", () => expect(MIN_PASS_SCORE).toBe(5));
  const s = (score: number) => ({ programId: "p", activityId: "a", ai: ai(score) });
  it("passes at 5 using the best counted delivery", () => {
    expect(activityStanding([s(4), s(5)], "p", "a").passed).toBe(true);
    expect(activityStanding([s(4.9)], "p", "a").passed).toBe(false);
  });
});
describe("read failures", () => {
  it("tell the learner no attempt was used", () => {
    for (const c of READ_FAILURE_CODES) expect(issueMessage(c)).toMatch(/não contou como tentativa/);
  });
});
