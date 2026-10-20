export function authErrorKind(error: unknown): "weak_password" | "invalid_email" | "other" {
  if (!error || typeof error !== "object") return "other";
  const code = "code" in error ? error.code : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  if (code === "weak_password" || message.includes("password is known to be weak") || message.includes("password is too weak")) return "weak_password";
  if (message.includes("email address is not allowed")) return "invalid_email";
  return "other";
}