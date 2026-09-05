"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  SquareCode,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { editorExtensions, EMPTY_DOC } from "@/lib/editor-extensions";
import { uploadEditorImage } from "@/server/uploads";

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

const FONT_SIZES = ["12px", "14px", "16px", "18px", "24px", "30px"];

async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await uploadEditorImage(fd);
  return res.ok ? res.url : null;
}

export function SectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (doc: unknown) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: editorExtensions,
    content: (value as object) ?? EMPTY_DOC,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-doc min-h-[260px] max-h-[560px] overflow-y-auto rounded-b-md border border-t-0 border-slate-300 bg-white p-4 text-sm outline-none",
      },
      handlePaste: (_view, event) => {
        const img = [...(event.clipboardData?.files ?? [])].find((f) =>
          f.type.startsWith("image/"),
        );
        if (!img) return false;
        event.preventDefault();
        void insertImageFile(img);
        return true;
      },
      handleDrop: (_view, event) => {
        const img = [...(event.dataTransfer?.files ?? [])].find((f) =>
          f.type.startsWith("image/"),
        );
        if (!img) return false;
        event.preventDefault();
        void insertImageFile(img);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  const insertImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      try {
        const url = await uploadFile(file);
        if (url) editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } finally {
        setUploading(false);
      }
    },
    [editor],
  );

  // Keep external resets (e.g. switching which section is edited) in sync.
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    if (JSON.stringify(value) !== current) {
      editor.commands.setContent((value as object) ?? EMPTY_DOC, {
        emitUpdate: false,
      });
    }
  }, [value, editor]);

  if (!editor) return null;

  const inTable = editor.isActive("table");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-slate-300 bg-slate-50 p-1">
        <Btn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 size={15} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 size={15} />
        </Btn>

        <Divider />

        <select
          className="rounded border border-slate-300 bg-white px-1 py-1 text-xs"
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                  ? "3"
                  : editor.isActive("heading", { level: 4 })
                    ? "4"
                    : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .toggleHeading({ level: Number(v) as 1 | 2 | 3 | 4 })
                .run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
        </select>

        <select
          className="rounded border border-slate-300 bg-white px-1 py-1 text-xs"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return;
            if (v === "unset") editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(v).run();
            e.target.value = "";
          }}
        >
          <option value="">Size…</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s.replace("px", "")}
            </option>
          ))}
          <option value="unset">Reset</option>
        </select>

        <Divider />

        <Btn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={15} />
        </Btn>
        <Btn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={15} />
        </Btn>
        <Btn
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon size={15} />
        </Btn>
        <Btn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough size={15} />
        </Btn>
        <Btn
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline code"
        >
          <Code size={15} />
        </Btn>
        <Btn
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          title="Superscript"
        >
          <SuperscriptIcon size={15} />
        </Btn>
        <Btn
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          title="Subscript"
        >
          <SubscriptIcon size={15} />
        </Btn>

        <Divider />

        <label
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-slate-200"
          title="Text colour"
        >
          <span
            className="h-3.5 w-3.5 rounded-sm border border-slate-400"
            style={{ background: editor.getAttributes("textStyle").color || "#141414" }}
          />
          <input
            type="color"
            className="sr-only"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        <label
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-slate-200"
          title="Highlight"
        >
          <Highlighter size={15} />
          <input
            type="color"
            className="sr-only"
            onChange={(e) =>
              editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
            }
          />
        </label>
        <Btn
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetColor()
              .unsetHighlight()
              .unsetFontSize()
              .run()
          }
          title="Clear formatting"
        >
          <RemoveFormatting size={15} />
        </Btn>

        <Divider />

        <Btn
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align left"
        >
          <AlignLeft size={15} />
        </Btn>
        <Btn
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align centre"
        >
          <AlignCenter size={15} />
        </Btn>
        <Btn
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align right"
        >
          <AlignRight size={15} />
        </Btn>
        <Btn
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          title="Justify"
        >
          <AlignJustify size={15} />
        </Btn>

        <Divider />

        <Btn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List size={15} />
        </Btn>
        <Btn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered size={15} />
        </Btn>
        <Btn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          <Quote size={15} />
        </Btn>
        <Btn
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <SquareCode size={15} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus size={15} />
        </Btn>

        <Divider />

        <Btn
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL", prev ?? "https://");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          }}
          title="Link"
        >
          <LinkIcon size={15} />
        </Btn>
        <Btn
          disabled={!editor.isActive("link")}
          onClick={() =>
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
          }
          title="Remove link"
        >
          <Link2Off size={15} />
        </Btn>

        <Btn
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title={uploading ? "Uploading…" : "Insert image"}
        >
          <ImagePlus size={15} />
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void insertImageFile(f);
            e.target.value = "";
          }}
        />

        <Btn
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          title="Insert table"
        >
          <TableIcon size={15} />
        </Btn>

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

      {inTable && <TableToolbar editor={editor} />}

      <EditorContent editor={editor} />
      <p className="mt-1 text-xs text-slate-400">
        Put <code>{"{{boq.table}}"}</code> on its own line to drop in the Bill of
        Quantities table. Paste or drag an image straight into the editor.
      </p>
    </div>
  );
}

function TableToolbar({ editor }: { editor: Editor }) {
  const item = "rounded px-2 py-1 text-xs hover:bg-slate-200";
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-x border-slate-300 bg-slate-100 px-1 py-1 text-slate-600">
      <span className="px-1 text-xs font-medium text-slate-500">Table:</span>
      <button type="button" className={item} onClick={() => editor.chain().focus().addColumnBefore().run()}>
        +Col left
      </button>
      <button type="button" className={item} onClick={() => editor.chain().focus().addColumnAfter().run()}>
        +Col right
      </button>
      <button type="button" className={item} onClick={() => editor.chain().focus().deleteColumn().run()}>
        −Col
      </button>
      <button type="button" className={item} onClick={() => editor.chain().focus().addRowBefore().run()}>
        +Row above
      </button>
      <button type="button" className={item} onClick={() => editor.chain().focus().addRowAfter().run()}>
        +Row below
      </button>
      <button type="button" className={item} onClick={() => editor.chain().focus().deleteRow().run()}>
        −Row
      </button>
      <button type="button" className={item} onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
        Header row
      </button>
      <button type="button" className={item} onClick={() => editor.chain().focus().mergeOrSplit().run()}>
        Merge / split
      </button>
      <button
        type="button"
        className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash2 size={13} /> Delete table
      </button>
    </div>
  );
}

function Btn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded transition disabled:opacity-40 ${
        active ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-300" />;
}
