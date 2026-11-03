import { describe, expect, it } from "vitest";
import { courseFaculty, courseLead, photoError, resolveActivityStaff, visiblePeople } from "@/lib/professionals";
import { UPLOAD_RULES_LABEL, deliverySchema, pageGuidance } from "@/lib/learning-rules";

const row = (id: string, extra: Partial<{ active: boolean; display_authorized: boolean; photo_path: string | null }> = {}) => ({
  id, full_name: `Prof ${id}`, title: "Sócia", specialty: "Arbitragem", bio: "", photo_path: null, active: true, display_authorized: true, ...extra,
});
const people = visiblePeople([row("ana"), row("bia"), row("cris", { display_authorized: false }), row("dani", { active: false })], new Map());
const links = [
  { professional_id: "bia", is_lead: false, position: 0 },
  { professional_id: "ana", is_lead: true, position: 1 },
];

describe("professores dos cursos e atividades", () => {
  it("o professor principal é o marcado como principal", () => {
    expect(courseLead(links, people)?.id).toBe("ana");
    expect(courseFaculty(links, people).map((p) => p.id)).toEqual(["ana", "bia"]);
  });
  it("sem principal marcado, usa o primeiro vinculado", () => {
    expect(courseLead([{ professional_id: "bia", is_lead: false, position: 0 }], people)?.id).toBe("bia");
  });
  it("a atividade usa o supervisor específico quando definido", () => {
    const s = resolveActivityStaff(links, { supervisor_id: "bia", feedback_professional_id: null, demand_video_url: "" }, people);
    expect(s.supervisor?.id).toBe("bia");
    expect(s.feedback?.id).toBe("ana");
  });
  it("sem supervisor específico, recorre ao professor do curso", () => {
    expect(resolveActivityStaff(links, undefined, people).supervisor?.id).toBe("ana");
  });
  it("profissional inativo ou sem exibição autorizada nunca aparece; cai no professor do curso", () => {
    expect(people.has("cris")).toBe(false);
    expect(people.has("dani")).toBe(false);
    expect(resolveActivityStaff(links, { supervisor_id: "cris", feedback_professional_id: "dani", demand_video_url: "" }, people).supervisor?.id).toBe("ana");
  });
  it("sem professor no curso, não inventa ninguém", () => {
    const s = resolveActivityStaff([], undefined, people);
    expect(s.supervisor).toBeNull();
    expect(s.feedback).toBeNull();
    expect(s.demandVideoUrl).toBe("");
  });
  it("o mesmo cadastro serve vários cursos sem duplicar", () => {
    const a = courseLead([{ professional_id: "ana", is_lead: true, position: 0 }], people);
    const b = courseLead([{ professional_id: "ana", is_lead: true, position: 0 }], people);
    expect(a).toBe(b);
  });
});

describe("foto do profissional", () => {
  it("aceita JPG, PNG e WEBP até 2 MB", () => {
    expect(photoError({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
    expect(photoError({ type: "image/webp", size: 1000 })).toBeNull();
  });
  it("recusa outros formatos e arquivos acima de 2 MB", () => {
    expect(photoError({ type: "image/gif", size: 1000 })).not.toBeNull();
    expect(photoError({ type: "application/pdf", size: 1000 })).not.toBeNull();
    expect(photoError({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).not.toBeNull();
  });
});

describe("informações de envio", () => {
  it("o texto mostra PDF, DOC e DOCX até 10 MB, como o servidor aceita", () => {
    expect(UPLOAD_RULES_LABEL).toBe("PDF, DOC ou DOCX · até 10 MB");
    const base = { programId: "p1", activityId: "a1", filePath: "x", aiUse: "" };
    expect(deliverySchema.safeParse({ ...base, fileName: "a.doc", fileSize: 10 * 1024 * 1024 }).success).toBe(true);
    expect(deliverySchema.safeParse({ ...base, fileName: "a.pdf", fileSize: 10 * 1024 * 1024 + 1 }).success).toBe(false);
  });
  it("a orientação de páginas aparece separada, sem virar validação", () => {
    expect(pageGuidance(".docx ou .pdf · até 5 páginas")).toBe("Orientação do exercício: até 5 páginas.");
    expect(pageGuidance("")).toBeNull();
  });
});
