import { describe, expect, it } from "vitest";
import { abandonedOrders, accessUntil, activityTimes, formatDuration } from "@/lib/admin-insights";

describe("admin insights", () => {
  it("a purchase gives six months of access", () => {
    expect(accessUntil("2026-11-12T12:00:00Z").toISOString().slice(0, 10)).toBe("2027-05-12");
  });
  it("unpaid orders older than an hour count as gave up, unless the course was bought later", () => {
    const now = new Date("2026-11-12T12:00:00Z").getTime();
    const orders = [
      { id: "a", user_id: "u1", status: "pending", created_at: "2026-11-12T09:00:00Z", total_cents: 9900, items: ["Curso Simulado"] },
      { id: "b", user_id: "u2", status: "awaiting_integration", created_at: "2026-11-12T11:30:00Z", total_cents: 9900, items: ["Curso Simulado"] },
      { id: "c", user_id: "u3", status: "rejected", created_at: "2026-11-10T09:00:00Z", total_cents: 9900, items: ["Curso Teórico"] },
      { id: "d", user_id: "u3", status: "paid", created_at: "2026-11-11T09:00:00Z", total_cents: 9900, items: ["Curso Teórico"] },
    ];
    expect(abandonedOrders(orders, now).map((o) => o.id)).toEqual(["a"]);
  });
  it("activity time runs from first opening to first delivery", () => {
    const programs = [{ id: "p1", slug: "sim", title: "Simulado", activities: [{ id: "a1", title: "Contrato" }] }];
    const r = activityTimes(programs,
      [{ user_id: "u", path: "/estagio/sim/1/caso", created_at: "2026-11-10T10:00:00Z" }, { user_id: "u", path: "/estagio/sim/1/demanda", created_at: "2026-11-10T11:00:00Z" }],
      [{ user_id: "u", program_id: "p1", activity_id: "a1", submitted_at: "2026-11-10T13:00:00Z" }, { user_id: "u", program_id: "p1", activity_id: "a1", submitted_at: "2026-11-11T13:00:00Z" }]);
    expect(r[0]!.avgMs).toBe(3 * 3600_000);
    expect(formatDuration(r[0]!.avgMs)).toBe("3 h");
  });
});
