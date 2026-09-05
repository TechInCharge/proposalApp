import { parse } from "node-html-parser";
import { saveFile } from "@/lib/storage";

/**
 * Pasted images land in the section body as `data:` URIs. The PDF renderer
 * tolerates almost anything, but `@turbodocx/html-to-docx` throws
 * "Invalid base64 string" unless the URI is exactly
 * `data:<simple-mime>;base64,<single line>` — so a payload with newlines, a
 * MIME type containing digits/dots (`image/vnd.microsoft.icon`), a
 * percent-encoded SVG, or a `blob:` URL all break generation.
 *
 * `sanitizeContentImages` normalises every `<img>` for the renderers (no I/O).
 * `offloadDataUriImages` is the save-time version: it writes each `data:` image
 * to storage and swaps in a `/api/files/...` URL, keeping giant base64 blobs
 * out of the database.
 */

const SAFE_MIME: Record<string, string> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
  "image/bmp": "image/bmp",
  "image/svg+xml": "image/svg+xml",
  "image/svg": "image/svg+xml",
};

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
};

function sniffMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf.length > 12 &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
  const head = buf.toString("utf8", 0, 200).trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
  return null;
}

/** Decode a `data:` URI to bytes + a renderer-safe MIME, or null if unusable. */
export function decodeDataUri(src: string): { mime: string; buf: Buffer } | null {
  const m = /^data:([^,]*),([\s\S]*)$/.exec(src.trim());
  if (!m) return null;
  const meta = m[1].toLowerCase();
  const isB64 = meta.includes(";base64");
  const declared = meta.split(";")[0].trim();
  let buf: Buffer;
  try {
    if (isB64) {
      const b64 = m[2].replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
      if (!b64 || /[^A-Za-z0-9+/=]/.test(b64)) return null;
      buf = Buffer.from(b64, "base64");
    } else {
      buf = Buffer.from(decodeURIComponent(m[2].trim()), "utf8");
    }
  } catch {
    return null;
  }
  if (buf.length < 8) return null;
  const mime = SAFE_MIME[declared] ?? sniffMime(buf);
  if (!mime) return null;
  return { mime, buf };
}

function rebuiltDataUri(d: { mime: string; buf: Buffer }): string {
  return `data:${d.mime};base64,${d.buf.toString("base64")}`;
}

/**
 * Generation-time: make every `<img>` safe for the PDF/DOCX writers.
 * `/api/files/...` and `http(s)` sources pass through untouched; `data:` URIs
 * are re-encoded clean; anything else (`blob:`, `file:`, empty, undecodable)
 * has its `<img>` removed.
 */
export function sanitizeContentImages(html: string): string {
  if (!html || !html.includes("<img")) return html;
  const root = parse(html, { comment: false });
  for (const img of root.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (src.startsWith("/api/files/") || /^https?:\/\//i.test(src)) continue;
    if (src.startsWith("data:")) {
      const d = decodeDataUri(src);
      if (d) img.setAttribute("src", rebuiltDataUri(d));
      else img.replaceWith("");
      continue;
    }
    img.replaceWith("");
  }
  return root.toString();
}

/**
 * Save-time: persist each `data:` image to storage and swap in a
 * `/api/files/...` URL. Undecodable images and `blob:`/`file:` sources are
 * dropped. Returns the HTML unchanged when it holds no such images.
 */
export async function offloadDataUriImages(html: string): Promise<string> {
  if (!html || !/<img\b/i.test(html)) return html;
  if (!/src="(data:|blob:|file:)/i.test(html)) return html;
  const root = parse(html, { comment: false });
  for (const img of root.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (src.startsWith("blob:") || src.startsWith("file:")) {
      img.replaceWith("");
      continue;
    }
    if (!src.startsWith("data:")) continue;
    const d = decodeDataUri(src);
    if (!d) {
      img.replaceWith("");
      continue;
    }
    try {
      const { url } = await saveFile(d.buf, {
        prefix: "editor-images",
        ext: MIME_EXT[d.mime] ?? "png",
      });
      img.setAttribute("src", url);
    } catch {
      img.replaceWith("");
    }
  }
  return root.toString();
}
