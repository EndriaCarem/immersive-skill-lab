import { describe, it, expect } from "vitest";
import { safeAccessReturn } from "@/lib/site-access";

describe("legacy launch-access redirects", () => {
  it("restores the requested public destination without a shared-password screen", () => {
    expect(safeAccessReturn(undefined)).toBe("/");
    expect(safeAccessReturn("/")).toBe("/");
    expect(safeAccessReturn("/cursos")).toBe("/cursos");
    expect(safeAccessReturn("/conheca")).toBe("/conheca");
  });
  it("only returns visitors to same-site pages", () => {
    expect(safeAccessReturn("/cursos?tipo=pratico")).toBe("/cursos?tipo=pratico");
    for (const target of ["//external.test", "/\\external.test", "https://external.test", "/acesso-restrito", "/api/public/acesso-restrito"]) expect(safeAccessReturn(target)).toBe("/");
  });
});