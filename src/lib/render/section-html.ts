import { sanitizeSectionHtml } from "@/lib/render/sanitize";
import { docToHtml } from "@/lib/render/tiptap";
import { docxToHtmlFragment } from "@/lib/render/docx-to-html";
import { readBuffer } from "@/lib/storage";

const DOCX_URL = /^\/api\/files\/(section-bodies\/.+\.docx)$/;

/**
 * A section body is one of three formats, oldest first:
 *  - ProseMirror JSON (`{ type: "doc", ... }`) — pre-CKEditor rows, rendered
 *    through the legacy TipTap serialiser.
 *  - An HTML string — CKEditor-era rows.
 *  - A `/api/files/section-bodies/<uuid>.docx` URL — rows authored in the
 *    current SuperDoc editor.
 * Used by two callers: assemble.ts (the still-HTML-based preview route)
 * needs plain HTML for any of the three formats; compose-proposal.ts
 * (Phase 4's actual generation path) calls this only as a fallback for the
 * first two, non-docx formats, converting the result to .docx itself via
 * LibreOffice — it reads docx bodies directly instead. For assemble.ts, the
 * docx branch here is a bridge: convert to HTML via LibreOffice
 * (docx-to-html.ts) so the HTML preview can render content saved in the
 * current SuperDoc editor.
 */
export async function sectionBodyToHtml(body: unknown): Promise<string> {
  if (typeof body === "string") {
    const docxMatch = body.match(DOCX_URL);
    if (docxMatch) {
      try {
        const docx = await readBuffer(docxMatch[1]);
        return sanitizeSectionHtml(await docxToHtmlFragment(docx));
      } catch (err) {
        console.warn("sectionBodyToHtml: docx bridge failed", err);
        return "<p><em>[section content could not be rendered]</em></p>";
      }
    }
    return sanitizeSectionHtml(body);
  }
  if (body && typeof body === "object" && (body as { type?: unknown }).type === "doc") {
    return sanitizeSectionHtml(docToHtml(body));
  }
  return "";
}
