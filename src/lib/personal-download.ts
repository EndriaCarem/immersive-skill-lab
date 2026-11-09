import type { Doc } from "./store";
import { materialIdentity } from "./material-identity";
/** Inline authorized learning content remains text; add the account identity to the downloaded copy. */
export function downloadPersonalDoc(doc: Doc, studentName: string) {
  if (!studentName.trim()) throw new Error("Entre na sua conta para baixar este material.");
  const blob = new Blob([`${materialIdentity(studentName)}\n\n${doc.content || doc.name}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `${doc.name}.txt`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}