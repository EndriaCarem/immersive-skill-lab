import { describe, expect, it } from "vitest";
import { reviewPending, reviewsLeft, slaStatus, type Submission } from "@/lib/store";

const mk = (activityId: string, reviewed = true, extra: Partial<Submission> = {}): Submission => ({
  id: activityId, programId: "p1", activityId, student: "A", fileName: "", fileSize: 0, aiUse: "", submittedAt: "",
  ...(reviewed ? { humanReviews: ["x"] } : {}), ...extra,
});

describe("regras de revisão", () => {
  it("permite correção humana em até 2 atividades por curso", () => {
    expect(reviewsLeft({ submissions: [] }, "p1", "A")).toBe(2);
    expect(reviewsLeft({ submissions: [mk("a1"), mk("a2")] }, "p1", "A", "a3")).toBe(0);
    expect(reviewsLeft({ submissions: [mk("a1")] }, "p1", "A", "a2")).toBe(1);
  });
  it("gabarito trancado enquanto a revisão humana está pendente", () => {
    expect(reviewPending(mk("a1"))).toBe(true);
    expect(reviewPending(mk("a1", true, { reviewedAt: "2026-10-10" }))).toBe(false);
  });
  it("SLA de 24h estoura em vermelho", () => {
    const now = Date.parse("2026-10-02T00:00:00Z");
    expect(slaStatus("2026-10-01T20:00:00Z", now).k).toBe("ok");
    expect(slaStatus("2026-09-30T20:00:00Z", now).k).toBe("no");
  });
});
