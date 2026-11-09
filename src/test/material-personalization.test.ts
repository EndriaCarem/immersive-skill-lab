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
  it("identifies every XLSX sheet and preserves formulas and existing footer", async () => {
    const sheet = '<worksheet><sheetData><row r="1"><c r="A1"><f>SUM(B1:B2)</f></c></row></sheetData><headerFooter><oddFooter>Original</oddFooter></headerFooter><drawing r:id="rId1"/></worksheet>';
    const original = zipSync({ "xl/workbook.xml": strToU8('<workbook/>'), "xl/worksheets/sheet1.xml": strToU8(sheet), "xl/worksheets/sheet2.xml": strToU8('<worksheet><sheetData/><drawing r:id="rId1"/></worksheet>') });
    const result = await personalizeMaterial(original, "modelo.xlsx", "Aluna & Teste");
    const files = unzipSync(result.bytes);
    for (const path of ["xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]) expect(strFromU8(files[path] ?? new Uint8Array())).toContain("Aluna &amp;&amp; Teste");
    expect(strFromU8(files["xl/worksheets/sheet1.xml"] ?? new Uint8Array())).toContain('<f>SUM(B1:B2)</f>');
    expect(strFromU8(files["xl/worksheets/sheet1.xml"] ?? new Uint8Array())).toContain('Original');
    expect(strFromU8(files["xl/worksheets/sheet2.xml"] ?? new Uint8Array()).indexOf('</headerFooter>')).toBeLessThan(strFromU8(files["xl/worksheets/sheet2.xml"] ?? new Uint8Array()).indexOf('<drawing'));
    expect(strFromU8(unzipSync(original)["xl/worksheets/sheet1.xml"] ?? new Uint8Array())).toBe(sheet);
  });
  it("identifies every PPTX slide outside original content and keeps original unchanged", async () => {
    const slide = '<p:sld><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>Original</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>';
    const original = zipSync({ "ppt/presentation.xml": strToU8('<p:presentation><p:sldSz cx="9144000" cy="6858000"/></p:presentation>'), "ppt/slides/slide1.xml": strToU8(slide), "ppt/slides/slide2.xml": strToU8(slide) });
    const files = unzipSync((await personalizeMaterial(original, "aulas.pptx", "Aluna Teste")).bytes);
    expect(strFromU8(files["ppt/presentation.xml"] ?? new Uint8Array())).toContain('cy="7158000"');
    for (const path of ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml"]) {
      const xml = strFromU8(files[path] ?? new Uint8Array());
      expect(xml).toContain('Uso pessoal de Aluna Teste'); expect(xml).toContain('y="6858000"'); expect(xml).toContain('<a:t>Original</a:t>');
    }
    expect(strFromU8(unzipSync(original)["ppt/slides/slide1.xml"] ?? new Uint8Array())).toBe(slide);
  });
  it("refuses malformed modern Office documents rather than returning unmarked originals", async () => {
    for (const ext of ["xlsx", "pptx"]) await expect(personalizeMaterial(zipSync({}), `arquivo.${ext}`, "Aluna Teste")).rejects.toThrow(/inválida/);
  });
});