import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { downloadFile, fileKind, fmtSize, type FileRef } from "@/lib/files";

export function FileList({ files, onDelete }: { files: FileRef[]; onDelete?: (f: FileRef) => void }) {
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
