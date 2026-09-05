import { sanitizeSectionHtml } from "@/lib/render/sanitize";
import { docToHtml } from "@/lib/render/tiptap";

/**
 * A section body is now authored in CKEditor and stored as an HTML string.
 * Rows created before the editor swap still hold ProseMirror JSON
 * (`{ type: "doc", ... }`); those are rendered through the legacy TipTap
 * serialiser once, then sanitised the same way. `scripts/migrate-section-bodies.ts`
 * converts them permanently.
 */
export function sectionBodyToHtml(body: unknown): string {
  if (typeof body === "string") return sanitizeSectionHtml(body);
  if (body && typeof body === "object" && (body as { type?: unknown }).type === "doc") {
    return sanitizeSectionHtml(docToHtml(body));
  }
  return "";
}

/** True when a stored body is still in the pre-CKEditor ProseMirror format. */
export function isLegacyDocBody(body: unknown): boolean {
  return (
    !!body &&
    typeof body === "object" &&
    (body as { type?: unknown }).type === "doc"
  );
}
