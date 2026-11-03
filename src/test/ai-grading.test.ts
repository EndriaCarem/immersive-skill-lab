import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { deliveryStatusLabel, overallScore, parseEvaluation, resumableEvaluations, validateRubric, type RubricItem } from "@/lib/ai-grading-rules";
import { detectFormat, docxText, extractDocument } from "@/lib/document-text.server";

const rubric: RubricItem[] = [
  { criterion: "Atendimento à instrução da demanda", description: "", weight: 1 },
  { criterion: "Fundamentação", description: "", weight: 1 },
  { criterion: "Clareza, concisão e limite", description: "", weight: 1 },
];
const crit = (criterion: string, score: number) => ({ criterion, score, comment: "Comentário específico.", strengths: [], improvements: [] });
const output = (criteria: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ evaluable: true, notEvaluableReason: "", injectionAttempt: false, criteria, overallFeedback: "Síntese.", ethicsNote: "", ...extra });
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

describe("rubric validation", () => {
  const base = { id: "a1", title: "Revisão de cláusula", demandBody: "Analise a cláusula.", demandHtml: "" };
  it("accepts the teacher rubric and gives equal weight when none is set", () => {
    const r = validateRubric({ ...base, rubric: [{ criterion: "Fundamentação" }, { criterion: "Clareza" }] }, "p1");
    expect(r.ok && r.snapshot.criteria.map(c => c.weight)).toEqual([1, 1]);
  });
  it("rejects an activity without criteria", () => {
    expect(validateRubric({ ...base, rubric: [] }, "p1").ok).toBe(false);
  });
  it("rejects duplicated criteria", () => {
    expect(validateRubric({ ...base, rubric: [{ criterion: "Fundamentação" }, { criterion: "fundamentação" }] }, "p1").ok).toBe(false);
  });
  it("rejects an activity without a demand", () => {
    expect(validateRubric({ ...base, demandBody: " ", rubric: [{ criterion: "Fundamentação" }] }, "p1").ok).toBe(false);
  });
});

describe("model output validation", () => {
  it("accepts every criterion once and computes the final score on the server", () => {
    const r = parseEvaluation(output([crit(rubric[0]!.criterion, 8), crit(rubric[1]!.criterion, 7), crit(rubric[2]!.criterion, 9)], { overallScore: 2 }), rubric);
    expect(r.ok && r.overallScore).toBe(8);
  });
  it("weights the final score by criterion weight", () => {
    expect(overallScore([{ criterion: "A", score: 10 }, { criterion: "B", score: 4 }], [{ criterion: "A", description: "", weight: 2 }, { criterion: "B", description: "", weight: 1 }])).toBe(8);
  });
  it("rejects a missing criterion", () => {
    expect(parseEvaluation(output([crit(rubric[0]!.criterion, 8), crit(rubric[1]!.criterion, 7)]), rubric)).toMatchObject({ ok: false, code: "invalid_output" });
  });
  it("rejects a repeated criterion", () => {
    expect(parseEvaluation(output([crit(rubric[0]!.criterion, 8), crit(rubric[0]!.criterion, 7), crit(rubric[2]!.criterion, 9)]), rubric).ok).toBe(false);
  });
  it("rejects a criterion that is not in the rubric", () => {
    expect(parseEvaluation(output([crit(rubric[0]!.criterion, 8), crit("Inventado", 7), crit(rubric[2]!.criterion, 9)]), rubric).ok).toBe(false);
  });
  it("rejects scores outside 0–10", () => {
    expect(parseEvaluation(output([crit(rubric[0]!.criterion, 11), crit(rubric[1]!.criterion, 7), crit(rubric[2]!.criterion, 9)]), rubric).ok).toBe(false);
    expect(parseEvaluation(output([crit(rubric[0]!.criterion, -1), crit(rubric[1]!.criterion, 7), crit(rubric[2]!.criterion, 9)]), rubric).ok).toBe(false);
  });
  it("rejects malformed JSON", () => {
    expect(parseEvaluation("{nota: 10", rubric)).toMatchObject({ ok: false, code: "invalid_output" });
  });
  it("routes a non-evaluable delivery to human analysis", () => {
    expect(parseEvaluation(output([], { evaluable: false, notEvaluableReason: "Sem relação com a demanda" }), rubric)).toMatchObject({ ok: false, code: "not_evaluable" });
  });
});

describe("document reading", () => {
  const docx = (xml: string) => zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "word/document.xml": strToU8(xml) });
  it("detects the real format by content, not by extension", () => {
    expect(detectFormat(strToU8("%PDF-1.7"))).toBe("pdf");
    expect(detectFormat(docx("<w:document/>"))).toBe("docx");
    expect(detectFormat(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe("doc");
  });
  it("reads paragraphs from a DOCX", () => {
    expect(docxText(docx("<w:document><w:body><w:p><w:r><w:t>Cláusula &amp; sede</w:t></w:r></w:p><w:p><w:r><w:t>Segundo</w:t></w:r></w:p></w:body></w:document>"))).toBe("Cláusula & sede\nSegundo");
  });
  it("sends legacy DOC files to human analysis instead of treating them as DOCX", async () => {
    const doc = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    expect(await extractDocument(doc, "peca.docx")).toMatchObject({ ok: false, code: "doc_legacy" });
  });
  it("rejects a file whose content does not match its extension", async () => {
    expect(await extractDocument(docx("<w:document/>"), "peca.pdf")).toMatchObject({ ok: false, code: "format_mismatch" });
  });
  it("flags an empty DOCX", async () => {
    expect(await extractDocument(docx("<w:document><w:body><w:p/></w:body></w:document>"), "peca.docx")).toMatchObject({ ok: false, code: "empty_document" });
  });
  it("flags a corrupted file", async () => {
    expect(await extractDocument(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), "peca.docx")).toMatchObject({ ok: false, code: "file_unreadable" });
  });
});

describe("status labels", () => {
  it("names automated and human results by source without picking one", () => {
    expect(deliveryStatusLabel({ ai: { status: "completed", overallScore: 7.5 }, grades: [{ score: 8 }] }, fmt)).toBe("Corrigida · nota 7,5 (IA) · revisão humana 8,0");
  });
  it("never shows a grade while the evaluation is running", () => {
    expect(deliveryStatusLabel({ ai: { status: "evaluating" } }, fmt)).toBe("Entregue · em correção");
  });
});

describe("grading resume from waiting requests", () => {
  const subs = [
    { id: "queued", ai: { status: "pending" as const } },
    { id: "reading", ai: { status: "extracting" as const } },
    { id: "done", ai: { status: "completed" as const } },
    { id: "failed", ai: { status: "failed" as const } },
    { id: "no-eval" },
  ];
  it("resumes only gradings that are still moving", () => {
    expect(resumableEvaluations(subs, new Map(), 1_000_000)).toEqual(["queued", "reading"]);
  });
  it("asks again for the same delivery only after 60 seconds", () => {
    const kicked = new Map([["queued", 1_000_000]]);
    expect(resumableEvaluations(subs, kicked, 1_000_000 + 59_999)).toEqual(["reading"]);
    expect(resumableEvaluations(subs, kicked, 1_000_000 + 60_000)).toEqual(["queued", "reading"]);
  });
});
