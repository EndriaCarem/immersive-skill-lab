import { describe, expect, it } from "vitest";
import { postLoginDestination } from "@/lib/post-login";

describe("Post-login destination", () => {
  it("sends an account without purchases to the course catalog", () => {
    expect(postLoginDestination({ orders: [], enrollments: [] })).toBe("/cursos");
  });
  it("sends an account with purchase history to purchases", () => {
    expect(postLoginDestination({ orders: [{ status: "paid" }], enrollments: [] })).toBe("/compras");
  });
  it("sends an account with a free enrollment to purchases", () => {
    expect(postLoginDestination({ orders: [], enrollments: [{ status: "active" }] })).toBe("/compras");
  });
});