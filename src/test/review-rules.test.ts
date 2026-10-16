import { describe, expect, it } from "vitest";
import { reviewsLeft, slaStatus } from "@/lib/store";

const sub = (n: number) => ({ humanReviews: Array(n).fill("x") }) as never;
describe("regras de revisão", () => {
  it("permite até 2 revisões humanas", () => {
    expect(reviewsLeft(sub(0))).toBe(2);
    expect(reviewsLeft(sub(2))).toBe(0);
  });
  it("SLA de 24h estoura em vermelho", () => {
    const now = Date.parse("2026-10-02T00:00:00Z");
    expect(slaStatus("2026-10-01T20:00:00Z", now).k).toBe("ok");
    expect(slaStatus("2026-09-30T20:00:00Z", now).k).toBe("no");
  });
});
