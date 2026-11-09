import { describe, expect, it } from "vitest";
import { certificateStanding, signupSchema, sixMonthExpiry, testAccessSchema } from "@/lib/completion-rules";
import type { Program, Submission } from "@/lib/store";
const program = { id: "p", activities: [{ id: "a", title: "Atividade A" }, { id: "b", title: "Atividade B" }] } as Program;
const sub = (activityId: string, score: number) => ({ programId: "p", activityId, ai: { status: "completed", overallScore: score } }) as Submission;
describe("real certificate rules", () => {
  it("requires 5 in every activity, not a course average of 5", () => expect(certificateStanding(program, [sub("a", 4), sub("b", 10)]).eligible).toBe(false));
  it("uses best counted delivery and accepts exactly 5", () => expect(certificateStanding(program, [sub("a", 4), sub("a", 5), sub("b", 5)]).eligible).toBe(true));
  it("does not issue with a missing activity", () => expect(certificateStanding(program, [sub("a", 8)]).eligible).toBe(false));
  it("waits for a pending review even after a second delivery", () => expect(certificateStanding(program, [{ ...sub("a", 8), humanReviews: ["request"] }, sub("a", 9), sub("b", 8)]).eligible).toBe(false));
  it("voided delivery never qualifies", () => expect(certificateStanding(program, [{ ...sub("a", 8), voidedAt: "2026-11-09" }, sub("b", 8)]).eligible).toBe(false));
});
describe("test access and signup consent", () => {
  it("ends six calendar months from enrollment", () => expect(sixMonthExpiry("2026-11-09T12:00:00Z")).toBe("2027-05-09T12:00:00.000Z"));
  it("clamps end of month", () => expect(sixMonthExpiry("2026-08-31T00:00:00Z")).toBe("2027-02-28T00:00:00.000Z"));
  it("requires explicit test authorization", () => expect(testAccessSchema.safeParse({ enrollmentId: "11111111-1111-4111-8111-111111111111", confirmedTest: false, reason: "Teste autorizado" }).success).toBe(false));
  it("requires signup consent", () => expect(signupSchema.safeParse({ email: "test@example.invalid", password: "testpassword123", name: "Teste", termsId: "11111111-1111-4111-8111-111111111111", consent: false, origin: "https://empiria-law.com" }).success).toBe(false));
});