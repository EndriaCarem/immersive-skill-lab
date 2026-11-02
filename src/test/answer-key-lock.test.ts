import { describe, expect, it } from "vitest";
import { activityReviewPending, answerKeyOpen } from "@/lib/learning-rules";

type S = { programId: string; activityId: string; submittedAt: string; humanReviews?: string[]; reviewedAt?: string };
const sub = (activityId: string, submittedAt: string, review?: "pending" | "done"): S => ({
  programId: "p1", activityId, submittedAt,
  ...(review ? { humanReviews: ["2026-11-01T10:00:00Z"] } : {}),
  ...(review === "done" ? { reviewedAt: "2026-11-02T10:00:00Z" } : {}),
});

describe("gabarito durante revisão humana", () => {
  it("entrega sem revisão pendente libera o gabarito", () => {
    expect(answerKeyOpen([sub("a1", "1")], "p1", "a1")).toBe(true);
  });
  it("sem entrega o gabarito fica fechado", () => {
    expect(answerKeyOpen([], "p1", "a1")).toBe(false);
  });
  it("revisão pendente bloqueia o gabarito", () => {
    expect(answerKeyOpen([sub("a1", "1", "pending")], "p1", "a1")).toBe(false);
  });
  it("a 2ª entrega não libera o gabarito enquanto a revisão da 1ª está pendente", () => {
    const subs = [sub("a1", "1", "pending"), sub("a1", "2")];
    expect(activityReviewPending(subs, "p1", "a1")).toBe(true);
    expect(answerKeyOpen(subs, "p1", "a1")).toBe(false);
  });
  it("concluir a revisão restaura o acesso", () => {
    expect(answerKeyOpen([sub("a1", "1", "done"), sub("a1", "2")], "p1", "a1")).toBe(true);
  });
  it("revisão de outra atividade não bloqueia a atual", () => {
    expect(answerKeyOpen([sub("a1", "1", "pending"), sub("a2", "2")], "p1", "a2")).toBe(true);
  });
});
