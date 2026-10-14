import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Underline as U,
  Undo2,
  Wand2,
} from "lucide-react";
import { Rich, readMinutes, wordCount } from "./Rich";

export type Template = { label: string; html: string };

export function RichEditor({
  value,
  onChange,
  placeholder = "Escreva aqui…",
  templates = [],
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  templates?: Template[];
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [tplOpen, setTplOpen] = useState(false);
  const lastEmitted = useRef(value);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } } }), Placeholder.configure({ placeholder })],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });
  // keep in sync when the value is replaced from outside (e.g. switching activity)
  useEffect(() => {
    // Only push outside changes: skip values this editor just emitted while typing.
    if (!editor || editor.isDestroyed || value === lastEmitted.current) return;
    lastEmitted.current = value;
    if (value !== editor.getHTML() && !(value === "" && editor.isEmpty)) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  const st = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            b: e.isActive("bold"),
            i: e.isActive("italic"),
            u: e.isActive("underline"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            ul: e.isActive("bulletList"),
            ol: e.isActive("orderedList"),
            q: e.isActive("blockquote"),
            a: e.isActive("link"),
            p: e.isActive("paragraph"),
          }
        : null,
  });

  const c = () => editor!.chain().focus();
  const link = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link")["href"] as string | undefined;
    const url = window.prompt("Endereço do link (deixe vazio para remover)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) return c().extendMarkRange("link").unsetLink().run();
    if (!/^https?:\/\/|^mailto:/i.test(url)) return window.alert("Use um endereço começando com https:// ou mailto:");
    c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const B = ({ on, title, fn, children }: { on?: boolean | undefined; title: string; fn: () => unknown; children: React.ReactNode }) => (
    <button type="button" title={title} aria-label={title} className={on ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={fn} disabled={mode === "preview"}>
      {children}
    </button>
  );

  return (
    <div className="rte">
      <div className="bar">
        <B title="Negrito" on={st?.b} fn={() => c().toggleBold().run()}>
          <Bold size={15} />
        </B>
        <B title="Itálico" on={st?.i} fn={() => c().toggleItalic().run()}>
          <Italic size={15} />
        </B>
        <B title="Sublinhado" on={st?.u} fn={() => c().toggleUnderline().run()}>
          <U size={15} />
        </B>
        <span className="sep" />
        <B title="Parágrafo" on={st?.p && !st?.q} fn={() => c().setParagraph().run()}>
          <Pilcrow size={15} />
        </B>
        <B title="Título H2" on={st?.h2} fn={() => c().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} />
        </B>
        <B title="Título H3" on={st?.h3} fn={() => c().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={16} />
        </B>
        <span className="sep" />
        <B title="Lista com marcadores" on={st?.ul} fn={() => c().toggleBulletList().run()}>
          <List size={16} />
        </B>
        <B title="Lista numerada" on={st?.ol} fn={() => c().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </B>
        <B title="Citação / callout jurídico" on={st?.q} fn={() => c().toggleBlockquote().run()}>
          <Quote size={15} />
        </B>
        <B title="Inserir link" on={st?.a} fn={link}>
          <Link2 size={15} />
        </B>
        <span className="sep" />
        <B title="Desfazer" fn={() => c().undo().run()}>
          <Undo2 size={15} />
        </B>
        <B title="Refazer" fn={() => c().redo().run()}>
          <Redo2 size={15} />
        </B>
        {templates.length > 0 && (
          <span style={{ position: "relative" }}>
            <B title="Inserir modelo" fn={() => setTplOpen((o) => !o)}>
              <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <Wand2 size={14} /> Modelos
              </span>
            </B>
            {tplOpen && (
              <div style={{ position: "absolute", top: 34, left: 0, zIndex: 20, background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 14, padding: 6, boxShadow: "var(--shadow-lift)", minWidth: 240 }}>
                {templates.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 10, fontSize: 13.5, height: "auto" }}
                    onClick={() => {
                      c().insertContent(t.html).run();
                      setTplOpen(false);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </span>
        )}
        <div className="mode">
          <button type="button" className={mode === "edit" ? "on" : ""} onClick={() => setMode("edit")}>
            Editar
          </button>
          <button type="button" className={mode === "preview" ? "on" : ""} onClick={() => setMode("preview")}>
            <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <Eye size={13} /> Prévia
            </span>
          </button>
        </div>
      </div>
      <div className="area">
        <div style={{ display: mode === "edit" ? "block" : "none" }} className="rich">
          <EditorContent editor={editor} />
        </div>
        {mode === "preview" && (value ? <Rich html={value} /> : <p className="muted sm">Nada para pré-visualizar ainda.</p>)}
      </div>
      <div className="foot">
        <span>{wordCount(value)} palavras</span>
        <span>≈ {readMinutes(value)} min de leitura</span>
      </div>
    </div>
  );
}
