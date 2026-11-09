import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { extractText, getDocumentProxy } from "unpdf";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { personalizeMaterial } from "@/lib/material-personalization";
describe("personal learner copies", () => {
  it("identifies every PDF page without covering source content", async () => {
    const original = await PDFDocument.create(); original.addPage([500, 600]); original.addPage([500, 600]);
    const bytes = await original.save(); const result = await personalizeMaterial(bytes, "caso.pdf", "Aluna Teste");
    const output = await PDFDocument.load(result.bytes);
    expect(output.getPages().map(p => p.getHeight())).toEqual([624, 624]);
    const parsed = await extractText(await getDocumentProxy(result.bytes));
    expect(parsed.text.join(" ").match(/Aluna Teste/g)?.length).toBe(2);
    expect((await PDFDocument.load(bytes)).getPages()[0]?.getHeight()).toBe(600);
  });
  it("identifies text and retains its content", async () => {
    const result = await personalizeMaterial(strToU8("Contrato aprovado"), "contrato.txt", "Aluna Teste");
    expect(strFromU8(result.bytes)).toContain("Uso pessoal de Aluna Teste\n\nContrato aprovado");
  });
  it("identifies DOCX inside the editable document", async () => {
    const bytes = zipSync({ "word/document.xml": strToU8('<w:document xmlns:w="test"><w:body><w:p><w:r><w:t>Original</w:t></w:r></w:p></w:body></w:document>') });
    const result = await personalizeMaterial(bytes, "modelo.docx", "Aluna Teste");
    expect(strFromU8(unzipSync(result.bytes)["word/document.xml"] ?? new Uint8Array())).toContain("Uso pessoal de Aluna Teste");
    expect(strFromU8(unzipSync(bytes)["word/document.xml"] ?? new Uint8Array())).not.toContain("Aluna Teste");
  });
  it("preserves legacy office originals in an identified package", async () => {
    const bytes = strToU8("legacy"); const result = await personalizeMaterial(bytes, "modelo.doc", "Aluna Teste");
    const files = unzipSync(result.bytes);
    expect(Array.from(files["modelo.doc"] ?? [])).toEqual(Array.from(bytes));
    expect(strFromU8(files["IDENTIFICACAO.txt"] ?? new Uint8Array())).toContain("Aluna Teste");
  });
});