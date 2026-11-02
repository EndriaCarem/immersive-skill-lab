export type AuthErrorKind = "weak_password" | "invalid_email" | "invalid_credentials" | "email_not_confirmed" | "rate_limited" | "other";

export function authErrorKind(error: unknown): AuthErrorKind {
  if (!error || typeof error !== "object") return "other";
  const code = "code" in error ? error.code : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  if (code === "weak_password" || message.includes("password is known to be weak") || message.includes("password is too weak")) return "weak_password";
  if (message.includes("email address is not allowed")) return "invalid_email";
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) return "invalid_credentials";
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) return "email_not_confirmed";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || message.includes("rate limit")) return "rate_limited";
  return "other";
}
