"use client";

import { useMemo, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Subscript,
  Superscript,
  Link,
  AutoLink,
  List,
  ListProperties,
  BlockQuote,
  CodeBlock,
  HorizontalLine,
  PageBreak,
  Alignment,
  Indent,
  IndentBlock,
  FontSize,
  FontFamily,
  FontColor,
  FontBackgroundColor,
  Highlight,
  RemoveFormat,
  FindAndReplace,
  SourceEditing,
  SelectAll,
  SpecialCharacters,
  SpecialCharactersCurrency,
  SpecialCharactersText,
  SpecialCharactersMathematical,
  SpecialCharactersArrows,
  SpecialCharactersLatin,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUpload,
  AutoImage,
  SimpleUploadAdapter,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  TableCaption,
  TableColumnResize,
  Autoformat,
  PasteFromOffice,
  TextTransformation,
  Clipboard,
  type EditorConfig,
  type Editor,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { legacyDocToHtml, isLegacyProseMirrorDoc } from "@/lib/legacy-doc";

const DEFAULT_PLACEHOLDERS = [
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

const DEFAULT_HINT = (
  <span className="text-xs text-slate-400">
    Put <code>{"{{boq.table}}"}</code> on its own line to drop in the Bill of
    Quantities table.
  </span>
);

const editorConfig: EditorConfig = {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Clipboard,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    Subscript,
    Superscript,
    Link,
    AutoLink,
    List,
    ListProperties,
    BlockQuote,
    CodeBlock,
    HorizontalLine,
    PageBreak,
    Alignment,
    Indent,
    IndentBlock,
    FontSize,
    FontFamily,
    FontColor,
    FontBackgroundColor,
    Highlight,
    RemoveFormat,
    FindAndReplace,
    SourceEditing,
    SelectAll,
    SpecialCharacters,
    SpecialCharactersCurrency,
    SpecialCharactersText,
    SpecialCharactersMathematical,
    SpecialCharactersArrows,
    SpecialCharactersLatin,
    Image,
    ImageToolbar,
    ImageCaption,
    ImageStyle,
    ImageResize,
    ImageUpload,
    AutoImage,
    SimpleUploadAdapter,
    Table,
    TableToolbar,
    TableProperties,
    TableCellProperties,
    TableCaption,
    TableColumnResize,
    Autoformat,
    PasteFromOffice,
    TextTransformation,
  ],
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "fontFamily",
      "fontSize",
      "fontColor",
      "fontBackgroundColor",
      "highlight",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "subscript",
      "superscript",
      "code",
      "removeFormat",
      "|",
      "alignment",
      "outdent",
      "indent",
      "|",
      "bulletedList",
      "numberedList",
      "blockQuote",
      "|",
      "link",
      "insertImage",
      "insertTable",
      "codeBlock",
      "horizontalLine",
      "pageBreak",
      "specialCharacters",
      "|",
      "findAndReplace",
      "sourceEditing",
    ],
    shouldNotGroupWhenFull: true,
  },
  heading: {
    options: [
      { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
      { model: "heading1", view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
      { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
      { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
      { model: "heading4", view: "h4", title: "Heading 4", class: "ck-heading_heading4" },
    ],
  },
  fontSize: {
    options: [10, 12, "default", 14, 16, 18, 24, 30],
    supportAllValues: true,
  },
  fontFamily: { supportAllValues: true },
  list: { properties: { styles: true, startIndex: true, reversed: true } },
  link: {
    defaultProtocol: "https://",
    decorators: {
      openInNewTab: {
        mode: "manual",
        label: "Open in a new tab",
        attributes: { target: "_blank", rel: "noopener noreferrer" },
      },
    },
  },
  image: {
    toolbar: [
      "imageTextAlternative",
      "toggleImageCaption",
      "|",
      "imageStyle:inline",
      "imageStyle:alignLeft",
      "imageStyle:alignCenter",
      "imageStyle:alignRight",
      "|",
      "resizeImage",
    ],
  },
  table: {
    contentToolbar: [
      "tableColumn",
      "tableRow",
      "mergeTableCells",
      "|",
      "tableProperties",
      "tableCellProperties",
      "toggleTableCaption",
    ],
  },
  simpleUpload: { uploadUrl: "/api/editor/upload" },
};

/** Coerce whatever is stored (HTML string, legacy PM-JSON, null) to HTML. */
function toHtml(value: unknown): string {
  if (typeof value === "string") return value;
  if (isLegacyProseMirrorDoc(value)) return legacyDocToHtml(value);
  return "";
}

export function SectionEditorImpl({
  value,
  onChange,
  placeholders = DEFAULT_PLACEHOLDERS,
  hint = DEFAULT_HINT,
}: {
  value: unknown;
  onChange: (html: string) => void;
  placeholders?: string[];
  hint?: React.ReactNode;
}) {
  const editorRef = useRef<Editor | null>(null);
  const initialData = useMemo(() => toHtml(value), [value]);
  const wasLegacy = isLegacyProseMirrorDoc(value);

  function insertPlaceholder(token: string) {
    const editor = editorRef.current;
    if (!editor || !token) return;
    editor.model.change((writer) => {
      const pos = editor.model.document.selection.getFirstPosition();
      if (pos) writer.insertText(`{{${token}}}`, pos);
    });
    editor.editing.view.focus();
  }

  return (
    <div className="section-editor">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          value=""
          onChange={(e) => {
            insertPlaceholder(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="">Insert placeholder…</option>
          {placeholders.map((p) => (
            <option key={p} value={p}>
              {`{{${p}}}`}
            </option>
          ))}
        </select>
        {hint}
      </div>

      {wasLegacy && (
        <p className="mb-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          This section was created in the previous editor. Its content has been
          converted — review it, then save to store it in the new format.
        </p>
      )}

      <CKEditor
        editor={ClassicEditor}
        config={editorConfig}
        data={initialData}
        onReady={(editor) => {
          editorRef.current = editor as unknown as Editor;
          // Make the parent draft match the editor immediately, so saving a
          // freshly opened section (esp. a converted legacy one) never sends
          // back the raw input.
          onChange(editor.getData());
        }}
        onChange={(_evt, editor) => onChange(editor.getData())}
      />
    </div>
  );
}
