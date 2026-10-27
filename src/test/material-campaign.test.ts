import { describe, expect, it } from "vitest";
import { canCaptureMaterial } from "../lib/material-campaign";

describe("Material campaign access", () => {
  it("keeps capture locked until the video finishes", () => {
    expect(canCaptureMaterial("https://example.com/video.mp4", "https://example.com/material.pdf", false)).toBe(false);
    expect(canCaptureMaterial("https://example.com/video.mp4", "https://example.com/material.pdf", true)).toBe(true);
  });
  it("does not offer a download without the approved PDF", () => {
    expect(canCaptureMaterial("https://example.com/video.mp4", null, true)).toBe(false);
  });
});