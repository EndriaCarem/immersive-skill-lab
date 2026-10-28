import { describe, expect, it } from "vitest";
import { parseCampaignViewer } from "../lib/campaign-viewer";

describe("Campaign remembered viewer", () => {
  it("restores the saved visitor after reopening the page", () => {
    expect(parseCampaignViewer(JSON.stringify({ name: "Diego", interest: "Os dois" }))).toEqual({ name: "Diego", interest: "Os dois" });
  });
  it("keeps the form for a first visit or invalid saved data", () => {
    for (const raw of [null, "broken", "{}", '{"name":"","interest":"Os dois"}']) {
      expect(parseCampaignViewer(raw)).toBeNull();
    }
  });
});