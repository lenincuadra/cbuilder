import { NextResponse } from "next/server";
import type { RegistryRow } from "@/core/registry/types";
import { fileStore } from "@/lib/storage/fileStore";

// Reads/writes a local file — never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await fileStore.list();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const row = (await request.json()) as RegistryRow;
  try {
    await fileStore.add(row);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Add failed." },
      { status: 409 },
    );
  }
}
