"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

const PLACEHOLDERS = [
  "customer.name",
  "customer.website",
  "proposal.title",
  "proposal.date",
  "proposal.reference",
  "contact.name",
  "contact.title",
  "contact.email",
  "contact.phone",
  "boq.table",
];

export function SectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (doc: unknown) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: (value as object) ?? { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-doc min-h-[200px] rounded-b-md border border-t-0 border-slate-300 bg-white p-3 text-sm outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  // Keep external resets (e.g. switching which section is edited) in sync.
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    if (JSON.stringify(value) !== current) {
      editor.commands.setContent(
        (value as object) ?? { type: "doc", content: [{ type: "paragraph" }] },
        { emitUpdate: false },
      );
    }
  }, [value, editor]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `rounded px-2 py-1 text-xs ${active ? "bg-slate-800 text-white" : "bg-white hover:bg-slate-100"}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-slate-300 bg-slate-50 p-1">
        <button
          type="button"
          className={btn(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className={btn(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <button
          type="button"
          className={btn(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          className={btn(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <select
          className="ml-auto rounded border border-slate-300 bg-white px-1 py-1 text-xs"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().insertContent(`{{${e.target.value}}}`).run();
              e.target.value = "";
            }
          }}
        >
          <option value="">Insert placeholder…</option>
          {PLACEHOLDERS.map((p) => (
            <option key={p} value={p}>
              {`{{${p}}}`}
            </option>
          ))}
        </select>
      </div>
      <EditorContent editor={editor} />
      <p className="mt-1 text-xs text-slate-400">
        Put <code>{"{{boq.table}}"}</code> on its own line to drop in the Bill of
        Quantities table.
      </p>
    </div>
  );
}
