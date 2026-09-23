import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { signDocumentServerToken } from "@/lib/onlyoffice/jwt";
import { isOnlyOfficeDocKind, getDocRow } from "@/lib/onlyoffice/kinds";

function documentServerUrl(): string {
  const url = process.env.NEXT_PUBLIC_ONLYOFFICE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_ONLYOFFICE_URL is not set");
  return url.replace(/\/$/, "");
}

/**
 * Triggers OnlyOffice's "forcesave" command (the Document Server API for
 * "save right now" outside of the editor's own UI, driven by the app's own
 * Save button) and waits for the resulting callback to actually persist the
 * new body — the client only learns the save is real once this resolves.
 */
export async function POST(req: Request) {
  await requireUser();

  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  const id = body?.id;
  const key = body?.key;
  if (
    typeof kind !== "string" ||
    typeof id !== "string" ||
    typeof key !== "string" ||
    !isOnlyOfficeDocKind(kind)
  ) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const before = await getDocRow(kind, id);
  if (!before) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const command = { c: "forcesave", key };
  const token = await signDocumentServerToken(command);

  let commandRes: Response;
  try {
    commandRes = await fetch(`${documentServerUrl()}/coauthoring/CommandService.ashx`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...command, token }),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "document server unreachable" },
      { status: 502 },
    );
  }
  const commandJson = await commandRes.json().catch(() => null);
  if (!commandRes.ok || !commandJson || commandJson.error) {
    return NextResponse.json(
      { ok: false, error: `forcesave command failed (${commandJson?.error ?? commandRes.status})` },
      { status: 502 },
    );
  }

  // The command above only tells Document Server to start saving; the actual
  // bytes land via a separate, async POST to /api/onlyoffice/callback. Poll
  // until that's landed (it always produces a fresh saveFile write, even for
  // byte-identical content, so a changed updatedAt reliably means "done").
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    const after = await getDocRow(kind, id);
    if (after && after.updatedAt.getTime() !== before.updatedAt.getTime()) {
      return NextResponse.json({ ok: true, bodyUrl: after.bodyUrl });
    }
  }
  return NextResponse.json({ ok: false, error: "timed out waiting for save" }, { status: 504 });
}
