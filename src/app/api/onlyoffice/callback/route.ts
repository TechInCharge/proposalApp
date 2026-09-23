import { NextResponse } from "next/server";
import { verifyRouteToken, verifyDocumentServerToken } from "@/lib/onlyoffice/jwt";
import { isOnlyOfficeDocKind, setDocBodyUrl } from "@/lib/onlyoffice/kinds";
import { saveFile } from "@/lib/storage";

// OnlyOffice callback statuses: 0 no document, 1 editing, 2 ready for saving,
// 3 save error, 4 closed with no changes, 6 force-saving, 7 force-save error.
// https://api.onlyoffice.com/docs/docs-api/usage-api/callback-handler/
const SAVE_STATUSES = new Set([2, 6]);

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: 1, message: "missing token" }, { status: 401 });
  }

  let routePayload: Record<string, unknown>;
  try {
    routePayload = await verifyRouteToken(token);
  } catch {
    return NextResponse.json({ error: 1, message: "invalid token" }, { status: 401 });
  }
  const kind = routePayload.kind;
  const id = routePayload.id;
  if (typeof kind !== "string" || typeof id !== "string" || !isOnlyOfficeDocKind(kind)) {
    return NextResponse.json({ error: 1, message: "invalid token payload" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: 1, message: "invalid JSON" }, { status: 400 });
  }

  // Document Server signs every callback itself (Authorization header on
  // modern releases, a `token` field in the body on older ones) — verifying
  // the signature is enough to trust this really came from our own Document
  // Server instance (only it knows ONLYOFFICE_JWT_SECRET); we don't need to
  // additionally cross-check the payload shape against `body`.
  const authHeader = req.headers.get("authorization");
  const dsToken = authHeader?.replace(/^Bearer\s+/i, "") ?? (body.token as string | undefined);
  if (!dsToken) {
    return NextResponse.json(
      { error: 1, message: "missing document server signature" },
      { status: 401 },
    );
  }
  try {
    await verifyDocumentServerToken(dsToken);
  } catch {
    return NextResponse.json(
      { error: 1, message: "invalid document server signature" },
      { status: 401 },
    );
  }

  const status = typeof body.status === "number" ? body.status : -1;

  if (SAVE_STATUSES.has(status)) {
    const downloadUrl = body.url;
    if (typeof downloadUrl !== "string") {
      return NextResponse.json({ error: 1, message: "missing download url" }, { status: 400 });
    }
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: 1, message: "failed to fetch saved document" },
        { status: 502 },
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const { url } = await saveFile(buf, { prefix: "section-bodies", ext: "docx" });
    await setDocBodyUrl(kind, id, url);
  }

  // Every other status (editing in progress, closed with no changes, error
  // reports) just needs acknowledging so Document Server stops retrying.
  return NextResponse.json({ error: 0 });
}
