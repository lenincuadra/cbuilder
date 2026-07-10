import { NextResponse } from "next/server";
import { isValidStableRef, type StableLink } from "@/core/stableLinks/types";
import { fileStableLinksStore } from "@/lib/storage/fileStableLinksStore";

// Reads/writes a local file — never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const links = await fileStableLinksStore.list();
  return NextResponse.json(links);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<StableLink>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const ref = typeof body.ref === "string" ? body.ref.trim() : "";
  if (name === "" || !isValidStableRef(ref)) {
    return NextResponse.json({ error: "Nombre o ref inválido." }, { status: 400 });
  }
  try {
    await fileStableLinksStore.add({ name, ref, createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Add failed." },
      { status: 409 },
    );
  }
}
