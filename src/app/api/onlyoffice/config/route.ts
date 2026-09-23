import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { signRouteToken, signDocumentServerToken } from "@/lib/onlyoffice/jwt";
import { isOnlyOfficeDocKind, getDocRow } from "@/lib/onlyoffice/kinds";

function baseUrl(): string {
  const url = process.env.AUTH_URL;
  if (!url) throw new Error("AUTH_URL is not set");
  return url.replace(/\/$/, "");
}

/** Builds a JWT-signed OnlyOffice editor config for one section/proposal-section row. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const id = searchParams.get("id");
  if (!kind || !id || !isOnlyOfficeDocKind(kind)) {
    return NextResponse.json({ error: "invalid kind/id" }, { status: 400 });
  }

  const row = await getDocRow(kind, id);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Changes any time the row's content changes — Document Server uses this
  // to key its own cache/co-editing state, not us.
  const key = createHash("sha1")
    .update(`${kind}:${id}:${row.updatedAt.getTime()}`)
    .digest("hex")
    .slice(0, 32);

  const documentToken = await signRouteToken({ kind, id }, "10m");
  // Long-lived: covers a whole open editing session, not just the initial fetch.
  const callbackToken = await signRouteToken({ kind, id }, "12h");

  const config = {
    document: {
      fileType: "docx",
      key,
      title: `${kind === "section-template" ? "Section" : "Proposal section"}.docx`,
      url: `${baseUrl()}/api/onlyoffice/document?token=${documentToken}`,
      permissions: { edit: true, download: true, print: true },
    },
    documentType: "word",
    editorConfig: {
      mode: "edit",
      callbackUrl: `${baseUrl()}/api/onlyoffice/callback?token=${callbackToken}`,
      lang: "en",
      user: {
        id: session.user.id,
        name: session.user.name ?? session.user.email ?? "User",
      },
      customization: { autosave: true, forcesave: true },
    },
  };

  const token = await signDocumentServerToken(config);

  return NextResponse.json({ key, config: { ...config, token } });
}
