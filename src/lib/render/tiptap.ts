import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

export const editorExtensions = [StarterKit];

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

/** ProseMirror JSON -> HTML string. Safe for unknown / empty input. */
export function docToHtml(doc: unknown): string {
  try {
    const value =
      doc && typeof doc === "object" && (doc as { type?: string }).type === "doc"
        ? doc
        : EMPTY_DOC;
    return generateHTML(value as object, editorExtensions);
  } catch {
    return "";
  }
}
