import { describe, expect, it } from "vitest";
import { deliverySchema, currentSubmission, learningProgress } from "@/lib/learning-rules";
import type { Program, Submission } from "@/lib/store";

const base = { id: "one", programId: "p1", activityId: "a1", student: "account", fileName: "piece.pdf", fileSize: 20, aiUse: "", submittedAt: "2026-10-27T10:00:00Z" };
describe("account progress", () => {
  it("counts only the selected program's deliveries", () => {
    const program = { id: "p1", activities: [{ id: "a1" }, { id: "a2" }] } as Program;
    expect(learningProgress(program, [{ ...base, programId: "p2" }])).toEqual({ done: 0, total: 2, next: 0 });
    expect(learningProgress(program, [base, { ...base, id: "resubmit" }])).toEqual({ done: 1, total: 2, next: 1 });
  });
  it("restores the newest submission regardless of input order", () => {
    const newer: Submission = { ...base, id: "two", submittedAt: "2026-10-27T11:00:00Z", grades: [{ criterion: "Clareza", score: 8, comment: "" }] };
    expect(currentSubmission([newer, base], "p1", "a1")?.grades?.[0]?.score).toBe(8);
  });
  it("validates files rather than accepting an empty delivery", () => {
    expect(deliverySchema.safeParse({ ...base, filePath: "account/p1/file.pdf", fileSize: 0 }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...base, filePath: "account/p1/file.pdf" }).success).toBe(true);
  });
});