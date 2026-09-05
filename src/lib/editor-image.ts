import { saveFile } from "@/lib/storage";

const ALLOWED = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Validate and store an image picked/pasted/dropped in the section editor.
 * Shared by the CKEditor upload route. Auth is enforced by the caller.
 */
export async function storeEditorImage(
  file: unknown,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be under 8 MB" };
  }
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  if (!ALLOWED.has(ext)) {
    return { ok: false, error: "Use a PNG, JPG, GIF, WEBP or SVG image" };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const { url } = await saveFile(buf, { prefix: "editor-images", ext });
  return { ok: true, url };
}
