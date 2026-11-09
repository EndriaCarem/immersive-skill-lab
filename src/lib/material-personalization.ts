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
  // Legacy/other Office formats stay editable and unaltered; identity is in the delivered package, not claimed on every page.
  const cleanName = fileName.replace(/[\/\\]/g, "_");
  return { bytes: zipSync({ [cleanName]: bytes, "IDENTIFICACAO.txt": strToU8(`${marker}\nMaterial: ${cleanName}\nCopia de uso individual. O arquivo original neste pacote nao foi alterado.`) }), fileName: `${cleanName}.zip`, type: "application/zip" };
}