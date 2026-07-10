import { NextResponse } from "next/server";
import { fileStableLinksStore } from "@/lib/storage/fileStableLinksStore";

// Writes a local file — never statically cached.
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  await fileStableLinksStore.remove(ref);
  return NextResponse.json({ ok: true });
}
