import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";

/**
 * One extension list shared by the client editor (SectionEditor) and the
 * server-side renderer (src/lib/render/tiptap.ts). Both must agree on the
 * schema or stored documents fail to serialize.
 *
 * `resizable: true` on the table adds a client-only ProseMirror plugin; the
 * server renderer only reads the schema, so it's a no-op there.
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
