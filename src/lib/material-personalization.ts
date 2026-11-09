import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import { materialIdentity } from "./material-identity";
const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Creates a personal copy; originals are never overwritten. PDF pages are expanded to keep the identifying footer outside content. */
export async function personalizeMaterial(bytes: Uint8Array, fileName: string, studentName: string) {
  const marker = materialIdentity(studentName);
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "jpg" || ext === "png") {
    const output = await PDFDocument.create();
    const font = await output.embedFont(StandardFonts.Helvetica);
    const safeMarker = marker.normalize("NFKD").replace(/[^\x20-\x7e]/g, "");
    if (ext === "pdf") {
      const source = await PDFDocument.load(bytes);
      for (const sourcePage of source.getPages()) {
        if (!sourcePage.node.Contents()) sourcePage.drawText(" ", { x: 0, y: 0, size: 1 });
        const embedded = await output.embedPage(sourcePage);
        const page = output.addPage([embedded.width, embedded.height + 24]);
        page.drawPage(embedded, { x: 0, y: 24 });
        const size = Math.min(9, (page.getWidth() - 24) / Math.max(1, font.widthOfTextAtSize(safeMarker, 1)));
        page.drawText(safeMarker, { x: 12, y: 8, size, font, color: rgb(0.25, 0.25, 0.25) });
      }
    } else {
      const image = ext === "jpg" ? await output.embedJpg(bytes) : await output.embedPng(bytes);
      const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
      const page = output.addPage([image.width * scale, image.height * scale + 24]);
      page.drawImage(image, { x: 0, y: 24, width: image.width * scale, height: image.height * scale });
      page.drawText(safeMarker, { x: 8, y: 8, size: Math.min(9, (page.getWidth() - 16) / Math.max(1, font.widthOfTextAtSize(safeMarker, 1))), font });
    }
    return { bytes: await output.save(), fileName: fileName.replace(/\.[^.]+$/, ".pdf"), type: "application/pdf" };
  }
  if (ext === "txt") return { bytes: strToU8(`${marker}\n\n${strFromU8(bytes)}`), fileName, type: "text/plain;charset=utf-8" };
  if (ext === "docx") {
    const files = unzipSync(bytes); const document = files["word/document.xml"];
    if (!document) throw new Error("Documento inválido.");
    const xml = strFromU8(document);
    files["word/document.xml"] = strToU8(xml.replace(/(<w:body[^>]*>)/, `$1<w:p><w:r><w:t>${xmlEscape(marker)}</w:t></w:r></w:p>`));
    return { bytes: zipSync(files), fileName, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }
  if (ext === "xlsx") {
    const files = unzipSync(bytes);
    const sheets = Object.keys(files).filter(path => /^xl\/worksheets\/sheet\d+\.xml$/.test(path));
    if (!files["xl/workbook.xml"] || !sheets.length) throw new Error("Planilha inválida.");
    const footer = xmlEscape(marker.replace(/&/g, "&&"));
    for (const path of sheets) {
      let xml = strFromU8(files[path] ?? new Uint8Array());
      // Preserve cells, formulas and existing print settings; append identity to each footer variant.
      const section = xml.match(/<headerFooter\b[^>]*>[\s\S]*?<\/headerFooter>/)?.[0];
      if (section) {
        let updated = section;
        for (const tag of ["oddFooter", "evenFooter", "firstFooter"]) {
          const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
          updated = pattern.test(updated)
            ? updated.replace(pattern, (_, content: string) => `<${tag}>${content}\n&amp;C${footer}</${tag}>`)
            : updated.replace("</headerFooter>", `<${tag}>&amp;C${footer}</${tag}></headerFooter>`);
        }
        xml = xml.replace(section, updated);
      } else {
        xml = xml.replace(/<headerFooter\b[^>]*\/>/, "");
        const sectionXml = `<headerFooter><oddFooter>&amp;C${footer}</oddFooter><evenFooter>&amp;C${footer}</evenFooter><firstFooter>&amp;C${footer}</firstFooter></headerFooter>`;
        // OOXML requires headerFooter before these trailing worksheet elements.
        xml = xml.replace(/(?=<(?:rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b|<\/worksheet>)/, sectionXml);
      }
      if (!xml.includes(footer)) throw new Error("Não foi possível identificar a planilha.");
      files[path] = strToU8(xml);
    }
    return { bytes: zipSync(files), fileName, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }
  if (ext === "pptx") {
    const files = unzipSync(bytes);
    const presentation = strFromU8(files["ppt/presentation.xml"] ?? new Uint8Array());
    const size = presentation.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
    const slides = Object.keys(files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path));
    if (!size || !slides.length) throw new Error("Apresentação inválida.");
    const width = Number(size[1]); const height = Number(size[2]); const band = 300000;
    files["ppt/presentation.xml"] = strToU8(presentation.replace(size[0], size[0].replace(`cy="${height}"`, `cy="${height + band}"`)));
    for (const path of slides) {
      const xml = strFromU8(files[path] ?? new Uint8Array());
      const ids = [...xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map(match => Number(match[1]));
      const id = Math.max(1, ...ids) + 1;
      const footer = `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Identificação Empiria"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="${height}"/><a:ext cx="${width}" cy="${band}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="pt-BR" sz="900"/><a:t>${xmlEscape(marker)}</a:t></a:r></a:p></p:txBody></p:sp>`;
      if (!xml.includes("</p:spTree>")) throw new Error("Slide inválido.");
      files[path] = strToU8(xml.replace("</p:spTree>", `${footer}</p:spTree>`));
    }
    return { bytes: zipSync(files), fileName, type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
  }
  // Legacy/other Office formats stay editable and unaltered; identity is in the delivered package, not claimed on every page.
  const cleanName = fileName.replace(/[\/\\]/g, "_");
  return { bytes: zipSync({ [cleanName]: bytes, "IDENTIFICACAO.txt": strToU8(`${marker}\nMaterial: ${cleanName}\nCopia de uso individual. O arquivo original neste pacote nao foi alterado.`) }), fileName: `${cleanName}.zip`, type: "application/zip" };
}