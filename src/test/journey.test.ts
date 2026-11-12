import { describe, expect, it } from "vitest";
import { firstTouch, funnelStage, isTracked, sectionOf } from "@/lib/journey";

describe("journey attribution", () => {
  it("prefers utm_source over referrer", () => {
    expect(firstTouch(new URL("https://empiria-law.com/conheca?utm_source=instagram"), "https://google.com/", "empiria-law.com").source).toBe("instagram");
  });
  it("uses external referrer host, and direto for own site", () => {
    expect(firstTouch(new URL("https://empiria-law.com/"), "https://www.google.com/x", "empiria-law.com").source).toBe("google.com");
    expect(firstTouch(new URL("https://empiria-law.com/"), "https://empiria-law.com/sobre", "empiria-law.com").source).toBe("direto");
  });
  it("maps pages to sections and never tracks admin", () => {
    expect(sectionOf("/estagio/a/1/caso")).toBe("Atividades");
    expect(isTracked("/admin/comercial")).toBe(false);
  });
  it("a purchase is always the last funnel stage", () => {
    expect(funnelStage(new Set(["Início"]), true)).toBe(4);
    expect(funnelStage(new Set(["Início", "Cursos", "Entrar ou cadastrar"]), false)).toBe(2);
  });
});
