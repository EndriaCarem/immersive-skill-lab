import { describe, expect, it } from "vitest";
import { RELEASE_SCHEDULE_ENABLED, demandMail, formatDuration, materialError, materialGroups, mediaPath, releaseGate, videoError, type ActivityMaterial } from "@/lib/activity-room";
import { resolveActivityStaff, visiblePeople } from "@/lib/professionals";

const person = (id: string, photo: string | null = null) => ({ id, full_name: `Prof ${id}`, title: "Sócia", specialty: "", bio: "", photo_path: photo, active: true, display_authorized: true });
const people = visiblePeople([person("lead"), person("sup")], new Map());
const links = [{ professional_id: "lead", is_lead: true, position: 0 }];
const content = { demandFrom: "Dra. Helena, sócia", demandSubject: "Helvetia — urgente", demandBody: "Texto do curso", demandHtml: "" };
const mat = (id: string, category: ActivityMaterial["category"]): ActivityMaterial => ({ id, title: id, docType: "", description: "", category, version: "", fileName: `${id}.pdf`, fileSize: 10 });

describe("sala prática — vídeo, e-mail e materiais", () => {
  it("vídeo enviado tem prioridade sobre o link e só usa duração real", () => {
    const s = resolveActivityStaff(links, { supervisor_id: null, feedback_professional_id: null, demand_video_url: "https://youtu.be/x", video_path: "p1/a1/v.mp4", video_duration_seconds: 247 }, people, new Map([["p1/a1/v.mp4", "https://signed/v"]]));
    expect(s.video?.url).toBe("https://signed/v");
    expect(s.video?.durationSeconds).toBe(247);
  });
  it("sem vídeo, nenhuma duração é exibida mesmo se houver número salvo", () => {
    const s = resolveActivityStaff(links, { supervisor_id: null, feedback_professional_id: null, demand_video_url: "", video_duration_seconds: 120 }, people);
    expect(s.video?.url).toBe("");
    expect(s.video?.durationSeconds).toBeNull();
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(247)).toBe("4:07");
  });
  it("arquivo de vídeo que não pôde ser assinado conta como ausente", () => {
    const s = resolveActivityStaff(links, { supervisor_id: null, feedback_professional_id: null, demand_video_url: "", video_path: "p1/a1/v.mp4" }, people);
    expect(s.video?.url).toBe("");
  });
  it("remetente do e-mail é o supervisor da atividade; sem ele, o professor principal", () => {
    const own = resolveActivityStaff(links, { supervisor_id: "sup", feedback_professional_id: null, demand_video_url: "" }, people);
    expect(demandMail(content, own).from).toBe("Prof sup");
    expect(demandMail(content, resolveActivityStaff(links, undefined, people)).from).toBe("Prof lead");
  });
  it("sem profissional cadastrado, usa o remetente escrito no curso", () => {
    expect(demandMail(content, resolveActivityStaff([], undefined, visiblePeople([], new Map()))).from).toBe("Dra. Helena, sócia");
  });
  it("assunto e mensagem configurados pela administração prevalecem sobre o curso", () => {
    const s = resolveActivityStaff(links, { supervisor_id: null, feedback_professional_id: null, demand_video_url: "", mail_subject: "Novo assunto", mail_html: "<p>Nova</p>" }, people);
    const m = demandMail(content, s);
    expect(m.subject).toBe("Novo assunto");
    expect(m.html).toBe("<p>Nova</p>");
    expect(demandMail(content, resolveActivityStaff(links, undefined, people)).subject).toBe("Helvetia — urgente");
  });
  it("biblioteca separa documentos do caso e modelos de entrega", () => {
    const g = materialGroups([mat("contrato", "case"), mat("anexo", "annex"), mat("modelo", "template")]);
    expect(g.caseDocs.map((m) => m.id)).toEqual(["contrato", "anexo"]);
    expect(g.templates.map((m) => m.id)).toEqual(["modelo"]);
  });
  it("materiais aceitam até 25 MB; vídeos até 200 MB", () => {
    expect(materialError({ name: "a.pdf", size: 25 * 1024 * 1024 })).toBeNull();
    expect(materialError({ name: "a.pdf", size: 25 * 1024 * 1024 + 1 })).not.toBeNull();
    expect(materialError({ name: "a.exe", size: 10 })).not.toBeNull();
    expect(videoError({ name: "v.mp4", size: 200 * 1024 * 1024 + 1 })).not.toBeNull();
  });
  it("arquivos ficam na pasta do curso (usada pela permissão de matrícula)", () => {
    expect(mediaPath("p1", "a1", "Contrato.PDF", "00000000-0000-4000-8000-000000000000")).toBe("p1/a1/00000000-0000-4000-8000-000000000000.pdf");
  });
  it("nenhuma liberação semanal está ativa: só vale a progressão atual", () => {
    expect(RELEASE_SCHEDULE_ENABLED).toBe(false);
    expect(releaseGate({ releaseAt: "2099-01-01T00:00:00Z", offsetDays: 7 }).open).toBe(true);
  });
});
