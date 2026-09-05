// Use the Node/server entry: the default "@tiptap/html" export requires a real
// browser `window` and throws in a server runtime (which silently dropped every
// section body when the error was swallowed). The server build renders via
// happy-dom and works under `next` server actions, standalone scripts and tests.
import { generateHTML } from "@tiptap/html/server";
import { editorExtensions, EMPTY_DOC } from "@/lib/editor-extensions";

export { editorExtensions };

function isProseMirrorDoc(v: unknown): v is object {
  return !!v && typeof v === "object" && (v as { type?: string }).type === "doc";
}

/** ProseMirror JSON -> HTML string. Empty/blank input renders as an empty paragraph. */
export function docToHtml(doc: unknown): string {
  const value = isProseMirrorDoc(doc) ? doc : EMPTY_DOC;
  try {
    return generateHTML(value as object, editorExtensions);
  } catch (err) {
    // A genuinely malformed body: surface it rather than dropping the section.
    console.error("docToHtml failed to render section body:", err);
    return `<p><em>[section content could not be rendered]</em></p>`;
  }
}
