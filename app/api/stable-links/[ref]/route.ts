import { NextResponse } from "next/server";
import { isValidStableRef, type StableLink } from "@/core/stableLinks/types";
import { getServerStableLinksStore } from "@/lib/storage/serverStableLinks";

// Writes the durable store (Supabase on deploy, local file in dev) — never
// statically cached.
export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const body = (await request.json()) as Partial<StableLink>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const nextRef = typeof body.ref === "string" ? body.ref.trim() : "";
  if (name === "" || !isValidStableRef(nextRef)) {
    return NextResponse.json({ error: "Nombre o ref inválido." }, { status: 400 });
  }
  try {
    await getServerStableLinksStore().update(ref, { name, ref: nextRef });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  await getServerStableLinksStore().remove(ref);
  return NextResponse.json({ ok: true });
}
