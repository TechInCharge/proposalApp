import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { verifyRouteToken } from "@/lib/onlyoffice/jwt";
import { isOnlyOfficeDocKind, getDocRow } from "@/lib/onlyoffice/kinds";
import { readFile, contentTypeFor } from "@/lib/storage";
import { BLANK_DOCUMENT_URL } from "@/lib/onlyoffice/constants";

/**
 * Serves the current .docx bytes for one section/proposal-section row to the
 * Document Server, which fetches this server-to-server (no session cookie)
 * — auth is the signed, row-scoped token instead of `/api/files/...`'s
 * normal session check.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await verifyRouteToken(token);
  } catch {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 401 });
  }

  const kind = payload.kind;
  const id = payload.id;
  if (typeof kind !== "string" || typeof id !== "string" || !isOnlyOfficeDocKind(kind)) {
    return NextResponse.json({ error: "invalid token payload" }, { status: 400 });
  }

  const row = await getDocRow(kind, id);
  const bodyUrl = row?.bodyUrl ?? BLANK_DOCUMENT_URL;
  const m = bodyUrl.match(/^\/api\/files\/(.+)$/);
  if (!m) {
    return NextResponse.json({ error: "unreadable document" }, { status: 500 });
  }

  try {
    const { stream, size } = await readFile(m[1]);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "content-type": contentTypeFor(m[1]),
        "content-length": String(size),
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
