import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";

/**
 * TipTap/ProseMirror schema used only by src/lib/render/tiptap.ts to render
 * legacy pre-CKEditor ProseMirror-JSON section bodies to HTML. The client
 * editor (SectionEditor) moved to SuperDoc and no longer uses this schema —
 * it's kept solely so old stored rows in that format still render correctly.
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
  }),
  // TextStyle + Color + FontFamily + FontSize + LineHeight + BackgroundColor
  TextStyleKit,
  Highlight.configure({ multicolor: true }),
  Subscript,
  Superscript,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Image.configure({ inline: false, HTMLAttributes: { class: "doc-image" } }),
  TableKit.configure({
    table: { resizable: true, HTMLAttributes: { class: "doc-table" } },
  }),
];

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
