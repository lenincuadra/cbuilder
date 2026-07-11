import { NextResponse } from "next/server";
import { getServerStableLinksStore } from "@/lib/storage/serverStableLinks";

// Writes the durable store (Supabase on deploy, local file in dev) — never
// statically cached.
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  await getServerStableLinksStore().remove(ref);
  return NextResponse.json({ ok: true });
}
