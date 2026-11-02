import { describe, expect, it } from "vitest";
import { authErrorKind } from "@/lib/auth-errors";

describe("authentication error classification", () => {
  it("identifies the weak-password rejection without treating every 422 as a password error", () => {
    expect(authErrorKind({ code: "weak_password", status: 422 })).toBe("weak_password");
    expect(authErrorKind({ message: "Password is known to be weak and easy to guess, please choose a different one.", status: 422 })).toBe("weak_password");
    expect(authErrorKind({ status: 422, message: "Another validation failure" })).toBe("other");
  });
  it("identifies a wrong email or password by provider code or message, not status", () => {
    expect(authErrorKind({ code: "invalid_credentials", status: 400 })).toBe("invalid_credentials");
    expect(authErrorKind({ message: "Invalid login credentials", status: 400 })).toBe("invalid_credentials");
    expect(authErrorKind({ status: 400, message: "Something else" })).toBe("other");
  });
  it("identifies an unconfirmed email", () => {
    expect(authErrorKind({ code: "email_not_confirmed", status: 400 })).toBe("email_not_confirmed");
  });
});
