import { describe, it, expect } from "vitest";
import { purchaseSchema, couponSchema, discountCents } from "@/lib/commerce-schema";
const purchase = {
  productIds: ["p1"],
  method: "card",
  installments: 6,
  termsId: "11111111-1111-4111-8111-111111111111",
  consent: true,
  requestId: "22222222-2222-4222-8222-222222222222",
};
describe("Commerce rules", () => {
  it("accepts card in up to 6 installments and rejects 7", () => {
    expect(purchaseSchema.safeParse(purchase).success).toBe(true);
    expect(purchaseSchema.safeParse({ ...purchase, installments: 7 }).success).toBe(false);
  });
  it("accepts Pix without installments", () => {
    expect(purchaseSchema.safeParse({ ...purchase, method: "pix", installments: 1 }).success).toBe(
      true,
    );
    expect(purchaseSchema.safeParse({ ...purchase, method: "pix", installments: 2 }).success).toBe(
      false,
    );
  });
  it("accepts boleto without installments", () => {
    expect(
      purchaseSchema.safeParse({ ...purchase, method: "boleto", installments: 1 }).success,
    ).toBe(true);
    expect(
      purchaseSchema.safeParse({ ...purchase, method: "boleto", installments: 2 }).success,
    ).toBe(false);
  });
  it("requires explicit terms consent", () => {
    expect(purchaseSchema.safeParse({ ...purchase, consent: false }).success).toBe(false);
  });
  it("supports a combo without repeating products", () => {
    expect(purchaseSchema.safeParse({ ...purchase, productIds: ["p1", "p2"] }).success).toBe(true);
    expect(purchaseSchema.safeParse({ ...purchase, productIds: ["p1", "p1"] }).success).toBe(false);
  });
  it("calculates percentage coupons", () => {
    expect(discountCents(89000, "percent", 10)).toBe(8900);
  });
  it("calculates fixed coupons and caps free orders at zero", () => {
    expect(discountCents(89000, "fixed", 5000)).toBe(5000);
    expect(discountCents(89000, "fixed", 100000)).toBe(89000);
  });
  it("rejects percentage coupons above 100", () => {
    expect(
      couponSchema.safeParse({
        code: "FREE",
        kind: "percent",
        value: 101,
        active: true,
        max_uses: null,
        expires_at: null,
      }).success,
    ).toBe(false);
  });
});

import { discountCents as dc100 } from "@/lib/commerce-schema";
describe("cupom de 100%", () => {
  it("zera o total da Arbitragem — Nível 1 (R$ 890)", () => {
    expect(89000 - dc100(89000, "percent", 100)).toBe(0);
  });
});
