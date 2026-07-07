import { NextResponse } from "next/server";
import { fileNotesStore } from "@/lib/storage/fileNotesStore";

// Reads/writes a local file — never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const notes = await fileNotesStore.get();
  return NextResponse.json({ notes });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { notes?: unknown };
  const notes = typeof body.notes === "string" ? body.notes : "";
  try {
    await fileNotesStore.set(notes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed." },
      { status: 400 },
    );
  }
}
