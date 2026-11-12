import { describe, expect, it } from "vitest";
import { assistantLimitSchema, toCsv, withoutPurchase } from "@/lib/admin-people";

describe("assistant question limit", () => {
  it("accepts 3 and 10", () => { expect(assistantLimitSchema.safeParse(3).success).toBe(true); expect(assistantLimitSchema.safeParse(10).success).toBe(true); });
  it("rejects 2 and 11", () => { expect(assistantLimitSchema.safeParse(2).success).toBe(false); expect(assistantLimitSchema.safeParse(11).success).toBe(false); });
});
describe("people export", () => {
  it("flags accounts without paid or free order", () => {
    const r = withoutPurchase([{ id: "a" }, { id: "b" }, { id: "c" }], [{ user_id: "a", status: "paid" }, { user_id: "b", status: "rejected" }]);
    expect(r.map((x) => x.id)).toEqual(["b", "c"]);
  });
  it("neutralizes spreadsheet formulas", () => {
    expect(toCsv(["n"], [{ n: "=HYPERLINK(1)" }])).toContain(`"'=HYPERLINK(1)"`);
  });
});
