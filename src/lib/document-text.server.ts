import { unzipSync } from "fflate";
import { MAX_DOCUMENT_CHARS, MIN_READABLE_CHARS } from "./ai-grading-rules";

export type DocFormat = "pdf" | "docx" | "doc" | "unknown";
export type Extraction =
  | { ok: true; format: "pdf" | "docx"; text: string; chars: number; pages?: number; truncated: boolean }
  | { ok: false; code: "doc_legacy" | "pdf_no_text" | "file_unreadable" | "format_mismatch" | "empty_document"; format: DocFormat };

const MAX_PDF_PAGES = 60;
const MAX_XML_BYTES = 25 * 1024 * 1024;

/** Detects the real container from magic bytes; the file extension is only a claim. */
export function detectFormat(bytes: Uint8Array): DocFormat {
  const b = bytes;
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "pdf";
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return "docx";
  if (b.length >= 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 && b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1) return "doc";
  return "unknown";
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decode(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Reads the visible text of word/document.xml only — no macros, embedded objects or external relations are touched. */
export function docxText(bytes: Uint8Array): string | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: f => f.name === "word/document.xml" && f.originalSize <= MAX_XML_BYTES });
  } catch { return null; }
  const xml = files["word/document.xml"];
  if (!xml) return null;
  const body = new TextDecoder("utf-8", { fatal: false }).decode(xml);
  const text = body
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:(br|cr)\b[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:delText\b[^>]*>[\s\S]*?<\/w:delText>/g, "")
    .replace(/<[^>]+>/g, "");
  return normalize(decode(text));
}

export function normalize(s: string) {
  return s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function pdfText(bytes: Uint8Array): Promise<{ text: string; pages: number } | null> {
  try {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const pages = pdf.numPages;
    if (pages > MAX_PDF_PAGES) {
      const parts: string[] = [];
      for (let i = 1; i <= MAX_PDF_PAGES; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        parts.push(content.items.map(it => ("str" in it ? it.str : "")).join(" "));
      }
      return { text: normalize(parts.join("\n\n")), pages };
    }
    const { text } = await extractText(pdf, { mergePages: true });
    return { text: normalize(text), pages };
  } catch { return null; }
}

/** Extracts text from a delivery. The declared extension must match the real format. */
export async function extractDocument(bytes: Uint8Array, fileName: string): Promise<Extraction> {
  const format = detectFormat(bytes);
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (format === "doc" || (ext === "doc" && format !== "pdf" && format !== "docx")) return { ok: false, code: format === "doc" ? "doc_legacy" : "format_mismatch", format };
  if (format === "unknown") return { ok: false, code: "format_mismatch", format };
  if ((ext === "pdf") !== (format === "pdf") || (ext === "docx" && format !== "docx")) return { ok: false, code: "format_mismatch", format };
  let text: string, pages: number | undefined;
  if (format === "pdf") {
    const r = await pdfText(bytes);
    if (!r) return { ok: false, code: "file_unreadable", format };
    text = r.text; pages = r.pages;
    if (letters(text) < MIN_READABLE_CHARS) return { ok: false, code: letters(text) === 0 && pages === 0 ? "empty_document" : "pdf_no_text", format };
  } else {
    const r = docxText(bytes);
    if (r === null) return { ok: false, code: "file_unreadable", format };
    text = r;
    if (letters(text) < 40) return { ok: false, code: "empty_document", format };
  }
  const truncated = text.length > MAX_DOCUMENT_CHARS;
  return { ok: true, format, text: truncated ? text.slice(0, MAX_DOCUMENT_CHARS) : text, chars: text.length, ...(pages !== undefined ? { pages } : {}), truncated };
}

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;
