export const SITE_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;
export const SITE_LAUNCH_DATE = "28 de outubro de 2026";

export function isSiteAccessPublicPath(path: string) {
  return path === "/acesso-restrito" || path === "/api/public/acesso-restrito" || path === "/api/public/mercado-pago";
}

export function safeAccessReturn(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  if (value.split(/[?#]/)[0] === "/acesso-restrito" || value.startsWith("/api/")) return "/";
  return value;
}