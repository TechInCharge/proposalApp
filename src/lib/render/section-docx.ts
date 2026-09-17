import { readBuffer } from "@/lib/storage";

/**
 * Resolve a stored section/cover body to its .docx bytes.
 *
 * `body` is a `/api/files/section-bodies/<uuid>.docx` URL (a plain string
 * stored in the `Json` column — see prisma/schema.prisma). Legacy rows
 * (HTML strings or ProseMirror JSON, from before the SuperDoc migration) are
 * not given a runtime fallback here — scripts/migrate-section-bodies-to-docx.ts
 * converts them once, rather than paying that cost on every generation.
 */
export async function sectionBodyToDocxBuffer(body: unknown): Promise<Buffer | null> {
  if (typeof body !== "string" || body.trim() === "") return null;
  const match = body.match(/^\/api\/files\/(.+)$/);
  if (!match) return null;
  try {
    return await readBuffer(match[1]);
  } catch {
    return null;
  }
}
