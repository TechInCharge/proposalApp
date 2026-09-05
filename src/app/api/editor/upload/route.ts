import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { storeEditorImage } from "@/lib/editor-image";

/**
 * Upload endpoint for CKEditor's SimpleUploadAdapter. It POSTs
 * multipart/form-data with the file under `upload` and expects
 * `{ url }` back, or `{ error: { message } }` on failure.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { message: "Not signed in" } },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: { message: "Expected a file upload" } },
      { status: 400 },
    );
  }

  const res = await storeEditorImage(form.get("upload"));
  if (!res.ok) {
    return NextResponse.json({ error: { message: res.error } }, { status: 400 });
  }
  return NextResponse.json({ url: res.url });
}
