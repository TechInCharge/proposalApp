import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile, stat, readFile as fsReadFile } from "node:fs/promises";
import path from "node:path";

/**
 * Minimal storage adapter. Local-disk implementation for dev; swap the body of
 * these functions for an S3 client in production (keep the signatures).
 */

const CONFIGURED = process.env.STORAGE_DIR ?? ".storage";
const ROOT = path.isAbsolute(CONFIGURED)
  ? CONFIGURED
  : path.join(process.cwd(), CONFIGURED);

function safeJoin(...parts: string[]) {
  // Reject traversal in each segment, then join under ROOT.
  for (const seg of parts) {
    if (seg.split(/[/\\]/).includes("..")) {
      throw new Error("Path escapes storage root");
    }
  }
  return path.join(ROOT, ...parts);
}

export async function saveFile(
  data: Buffer | Uint8Array,
  opts: { prefix: string; ext: string; filename?: string },
): Promise<{ key: string; url: string }> {
  const name = opts.filename ?? `${randomUUID()}.${opts.ext.replace(/^\./, "")}`;
  const key = `${opts.prefix}/${name}`;
  const dest = safeJoin(opts.prefix, name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
  return { key, url: `/api/files/${key}` };
}

export async function readFile(key: string) {
  const full = safeJoin(...key.split("/"));
  const info = await stat(full);
  return { stream: createReadStream(full), size: info.size };
}

export async function readBuffer(key: string): Promise<Buffer> {
  return fsReadFile(safeJoin(...key.split("/")));
}

/** Turn a stored `/api/files/<key>` URL into a base64 data URI, else pass through. */
export async function toDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const m = url.match(/^\/api\/files\/(.+)$/);
  if (!m) return url;
  try {
    const buf = await readBuffer(m[1]);
    return `data:${contentTypeFor(m[1])};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function contentTypeFor(key: string): string {
  const ext = path.extname(key).toLowerCase();
  return (
    {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }[ext] ?? "application/octet-stream"
  );
}
