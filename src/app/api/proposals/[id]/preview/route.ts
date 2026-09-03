import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadAndAssemble } from "@/lib/render/load";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const assembled = await loadAndAssemble(id);
  if (!assembled) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(assembled.html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
