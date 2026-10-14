import { useEffect, useState } from "react";

/** Uploaded files live in the browser's IndexedDB (localStorage is too small for binaries). */
export type FileRef = { id: string; name: string; size: number; type: string };

const DB = "empiria-files";
const STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
  });
}

export async function saveFile(file: File): Promise<FileRef> {
  const id = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  await tx("readwrite", (s) => s.put(file, id));
  return { id, name: file.name, size: file.size, type: file.type };
}
export const getFile = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id));
export const deleteFile = (id: string) => tx("readwrite", (s) => s.delete(id)).catch(() => undefined);

export async function downloadFile(ref: FileRef) {
  const blob = await getFile(ref.id);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ref.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function useFileUrl(id?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return setUrl(null);
    let u: string | null = null;
    let alive = true;
    getFile(id)
      .then((b) => {
        if (b && alive) setUrl((u = URL.createObjectURL(b)));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return url;
}

export const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

export function fileKind(f: { name: string; type?: string }) {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { label: "PDF", cls: "pdf" };
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return { label: "DOC", cls: "doc" };
  if (f.type?.startsWith("image/")) return { label: "IMG", cls: "img" };
  return { label: (ext || "ARQ").slice(0, 4).toUpperCase(), cls: "" };
}
