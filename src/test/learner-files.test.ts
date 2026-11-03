import { describe, expect, it } from "vitest";
import { DELIVERY_FILE_MAX_AGE_MINUTES, ORPHAN_FILE_MIN_AGE_MINUTES, isFreshUpload, selectRemovableOrphans } from "@/lib/learning-rules";

describe("learner file safety", () => {
  const now = Date.parse("2026-11-03T12:00:00Z");
  it("accepts an upload made minutes ago as a delivery", () => {
    expect(isFreshUpload("2026-11-03T11:55:00Z", now)).toBe(true);
  });
  it("refuses to turn an upload older than 30 minutes into a delivery", () => {
    expect(isFreshUpload("2026-11-03T11:29:00Z", now)).toBe(false);
    expect(isFreshUpload(undefined, now)).toBe(false);
  });
  it("cleanup waits longer than the delivery window, so it never races a legitimate delivery", () => {
    expect(ORPHAN_FILE_MIN_AGE_MINUTES).toBeGreaterThan(DELIVERY_FILE_MAX_AGE_MINUTES);
  });
  it("never removes a file linked to a registered delivery", () => {
    expect(selectRemovableOrphans(["u/p1/a.pdf", "u/p1/b.pdf"], ["u/p1/a.pdf"])).toEqual(["u/p1/b.pdf"]);
  });
});
