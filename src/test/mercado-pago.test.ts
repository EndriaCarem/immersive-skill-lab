import { describe, it, expect } from "vitest";
import { excludedMethods, matchesTestPayment, verifyMpSignature } from "@/lib/mercado-pago-rules";

const payment = { id: 12, external_reference: "empiria-test:attempt", collector_id: 20, currency_id: "BRL", transaction_amount: 890, live_mode: false, status: "approved" as const, payment_type_id: "credit_card", payment_method_id: "visa", installments: 6, date_last_updated: "2026-10-22T16:00:00Z" };
const attempt = { id: "attempt", amount_cents: 89000, method: "card", installments: 6 };
describe("Mercado Pago test isolation", () => {
  it("accepts the matching R$890 test payment in six installments", () => { expect(matchesTestPayment(payment, attempt, 20)).toBe(true); });
  it("rejects seven card installments", () => { expect(matchesTestPayment({ ...payment, installments: 7 }, attempt, 20)).toBe(false); });
  it("rejects live payments in the test adapter", () => { expect(matchesTestPayment({ ...payment, live_mode: true }, attempt, 20)).toBe(false); });
  it("rejects mismatched amount, seller, currency and reference", () => {
    for (const change of [{ transaction_amount: 889 }, { collector_id: 21 }, { currency_id: "USD" }, { external_reference: "other" }]) expect(matchesTestPayment({ ...payment, ...change }, attempt, 20)).toBe(false);
  });
  it("offers only the selected Pix method", () => {
    expect(excludedMethods([{ id: "pix", status: "active", payment_type_id: "bank_transfer" }, { id: "visa", status: "active", payment_type_id: "credit_card" }, { id: "bolbradesco", status: "active", payment_type_id: "ticket" }], "pix")).toEqual([{ id: "visa" }, { id: "bolbradesco" }]);
  });
  it("rejects unsigned and expired callbacks and verifies valid signatures", async () => {
    const now = 1792684800000;
    const ts = String(now / 1000);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("test-fixture"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`id:12;request-id:request;ts:${ts};`));
    const signature = Array.from(new Uint8Array(bytes)).map((n) => n.toString(16).padStart(2, "0")).join("");
    const headers = new Headers({ "x-request-id": "request", "x-signature": `ts=${ts},v1=${signature}` });
    expect(await verifyMpSignature(headers, "12", "test-fixture", now)).toBe(true);
    expect(await verifyMpSignature(headers, "13", "test-fixture", now)).toBe(false);
    expect(await verifyMpSignature(headers, "12", "test-fixture", now + 360000)).toBe(false);
    expect(await verifyMpSignature(new Headers(), "12", "test-fixture", now)).toBe(false);
  });
});