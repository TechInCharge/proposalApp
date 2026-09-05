"use server";

import { requireUser } from "@/lib/rbac";
import { saveFile } from "@/lib/storage";

const ALLOWED = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

/**
 * Store an image dropped/pasted/picked in the rich-text editor and return a
 * URL to reference it by. Used for both section-template and per-proposal
 * section editing, so images live under a shared prefix.
 */
export async function uploadEditorImage(
  form: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > 8 * 1024 * 1024) {
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
