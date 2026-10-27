import { describe, it, expect } from "vitest";
import { isSiteAccessPublicPath, safeAccessReturn, SITE_LAUNCH_DATE } from "@/lib/site-access";
import { verifySiteCredentials } from "@/lib/site-access.server";

describe("restricted launch access", () => {
  it("allows the standalone /conheca campaign without restricted access", () => {
    expect(isSiteAccessPublicPath("/conheca")).toBe(true);
    expect(isSiteAccessPublicPath("/conheca/")).toBe(true);
    expect(isSiteAccessPublicPath("/conheca/private")).toBe(false);
  });
  it("keeps platform entries restricted outside the campaign and exact access endpoints", () => {
    for (const path of ["/", "/cursos", "/admin", "/auth", "/webinars", "/api/public/private", "/acesso-restrito/other"]) expect(isSiteAccessPublicPath(path)).toBe(false);
    expect(isSiteAccessPublicPath("/acesso-restrito")).toBe(true);
    expect(isSiteAccessPublicPath("/api/public/acesso-restrito")).toBe(true);
    expect(isSiteAccessPublicPath("/api/public/mercado-pago")).toBe(true);
    expect(isSiteAccessPublicPath("/api/public/mercado-pago/other")).toBe(false);
  });
  it("uses the requested official launch day", () => { expect(SITE_LAUNCH_DATE).toBe("28 de outubro de 2026"); });
  it("requires both server-configured credentials and fails closed", () => {
    const previousUser = process.env["SITE_ACCESS_USERNAME"];
    const previousPassword = process.env["SITE_PASSWORD"];
    process.env["SITE_ACCESS_USERNAME"] = "fixture-user";
    process.env["SITE_PASSWORD"] = "fixture-password";
    try {
      expect(verifySiteCredentials("fixture-user", "wrong")).toBe(false);
      expect(verifySiteCredentials("wrong", "fixture-password")).toBe(false);
      expect(verifySiteCredentials("fixture-user", "fixture-password")).toBe(true);
      delete process.env["SITE_PASSWORD"];
      expect(verifySiteCredentials("fixture-user", "fixture-password")).toBe(false);
    } finally {
      if (previousUser === undefined) delete process.env["SITE_ACCESS_USERNAME"]; else process.env["SITE_ACCESS_USERNAME"] = previousUser;
      if (previousPassword === undefined) delete process.env["SITE_PASSWORD"]; else process.env["SITE_PASSWORD"] = previousPassword;
    }
  });
  it("only returns visitors to same-site pages", () => {
    expect(safeAccessReturn("/cursos?tipo=pratico")).toBe("/cursos?tipo=pratico");
    for (const target of ["//external.test", "/\\external.test", "https://external.test", "/acesso-restrito", "/api/public/acesso-restrito"]) expect(safeAccessReturn(target)).toBe("/");
  });
});