import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveFile } from "@/lib/storage";

/**
 * Persists edited section/cover body bytes exported by the SuperDoc editor
 * (`superdoc.export({triggerDownload:false})` — a .docx Blob). Replaces the
 * old CKEditor `simpleUpload` image-adapter route for this purpose; images
 * inserted in SuperDoc are embedded directly in the document, so this only
 * ever handles the whole-document save.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "No document body provided" }, { status: 400 });
  }

  const { url } = await saveFile(buf, { prefix: "section-bodies", ext: "docx" });
  return NextResponse.json({ url });
}
