import DOMPurify from "dompurify";
import { useEffect, useState } from "react";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const paragraphsToHtml = (ps: string[]) => ps.map((p) => `<p>${esc(p)}</p>`).join("");
export const textToHtml = (t: string) => (t ? paragraphsToHtml(t.split(/\n+/).filter(Boolean)) : "");
export const htmlToText = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
export const wordCount = (h: string) => (htmlToText(h) ? htmlToText(h).split(" ").length : 0);
/** ~200 words/min reading speed. */
export const readMinutes = (h: string) => Math.max(1, Math.round(wordCount(h) / 200));

/** Renders author HTML, sanitized. Sanitizing needs the DOM, so it happens after hydration. */
export function Rich({ html, className = "" }: { html: string; className?: string }) {
  const [clean, setClean] = useState("");
  useEffect(() => {
    setClean(DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] }));
  }, [html]);
  return <div className={`rich ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
