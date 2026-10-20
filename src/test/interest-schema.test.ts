import { describe, expect, it } from "vitest";
import { interestSchema } from "@/lib/interest-schema";

const entry = { name: "Ana Silva", email: "ana@example.com", interest: "Arbitragem — Nível 1", message: "", consent: true, source: "interest", website: "", requestId: "12345678-1234-4234-8234-123456789abc" };
describe("Interest capture validation", () => {
  it("accepts an interest and normalizes email", () => { expect(interestSchema.parse({ ...entry, email: " ANA@EXAMPLE.COM " }).email).toBe("ana@example.com"); });
  it("rejects missing consent", () => { expect(interestSchema.safeParse({ ...entry, consent: false }).success).toBe(false); });
  it("rejects invalid email", () => { expect(interestSchema.safeParse({ ...entry, email: "invalid" }).success).toBe(false); });
  it("requires a message for contact", () => { expect(interestSchema.safeParse({ ...entry, source: "contact" }).success).toBe(false); });
  it("rejects oversized messages", () => { expect(interestSchema.safeParse({ ...entry, message: "a".repeat(2001) }).success).toBe(false); });
  it("rejects automated honeypot submissions", () => { expect(interestSchema.safeParse({ ...entry, website: "spam" }).success).toBe(false); });
});