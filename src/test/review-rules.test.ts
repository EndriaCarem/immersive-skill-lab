import { describe, expect, it } from "vitest";
import { reviewPending, reviewQuota, reviewsLeft, slaStatus, type Submission } from "@/lib/store";

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
  it("saldo do curso é separado do status da atividade já revisada", () => {
    const q = reviewQuota({ submissions: [mk("a1")] }, "p1", "A", "a1");
    expect(q.courseLeft).toBe(1);
    expect(q.status).toBe("pending");
    expect(q.canRequest).toBe(false);
  });
  it("revisão concluída mantém o saldo consumido", () => {
    const q = reviewQuota({ submissions: [mk("a1", true, { reviewedAt: "2026-11-01" })] }, "p1", "A", "a2");
    expect(q.courseLeft).toBe(1);
    expect(q.status).toBe("none");
    expect(q.canRequest).toBe(true);
  });
  it("duas atividades revisadas esgotam o saldo do curso", () => {
    const q = reviewQuota({ submissions: [mk("a1"), mk("a2")] }, "p1", "A", "a3");
    expect(q.courseLeft).toBe(0);
    expect(q.canRequest).toBe(false);
  });
  it("duas entregas na mesma atividade não contam como duas revisões", () => {
    const q = reviewQuota({ submissions: [mk("a1", false), mk("a1")] }, "p1", "A", "a2");
    expect(q.courseLeft).toBe(1);
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
