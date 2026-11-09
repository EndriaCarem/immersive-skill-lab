import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { downloadFile, getFile, fileKind, fmtSize, type FileRef } from "@/lib/files";

export function FileList({ files, onDelete, personalName }: { files: FileRef[]; onDelete?: (f: FileRef) => void; personalName?: string }) {
  if (!files.length) return null;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {files.map((f) => {
        const k = fileKind(f);
        return (
          <div className="fileitem" key={f.id}>
            <span className={`ft ${k.cls}`}>{k.label}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</b>
              <span className="muted sm">{fmtSize(f.size)}</span>
            </span>
            <button
              type="button"
              className="ibtn"
              aria-label={`Baixar ${f.name}`}
              onClick={async () => {
                if (personalName) {
                  try {
                    const blob = await getFile(f.id);
                    if (!blob) { toast.error("Arquivo indisponível neste navegador"); return; }
                    const { personalizeMaterial } = await import("@/lib/material-personalization");
                    const copy = await personalizeMaterial(new Uint8Array(await blob.arrayBuffer()), f.name, personalName);
                    const url = URL.createObjectURL(new Blob([new Uint8Array(copy.bytes)], { type: copy.type }));
                    const a = document.createElement("a"); a.href = url; a.download = copy.fileName; a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  } catch { toast.error("Não foi possível preparar a cópia identificada."); }
                  return;
                }
                if (!(await downloadFile(f))) toast.error("Arquivo indisponível neste navegador");
              }}
            >
              <Download size={16} />
            </button>
            {onDelete && (
              <button type="button" className="ibtn danger" aria-label={`Excluir ${f.name}`} onClick={() => onDelete(f)}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
