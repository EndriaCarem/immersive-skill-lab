import { describe, expect, it } from "vitest";
import { authErrorKind } from "@/lib/auth-errors";

describe("authentication error classification", () => {
  it("identifies the weak-password rejection without treating every 422 as a password error", () => {
    expect(authErrorKind({ code: "weak_password", status: 422 })).toBe("weak_password");
    expect(authErrorKind({ message: "Password is known to be weak and easy to guess, please choose a different one.", status: 422 })).toBe("weak_password");
    expect(authErrorKind({ status: 422, message: "Another validation failure" })).toBe("other");
  });
});