import { NextResponse } from "next/server";
import { getServerNotesStore } from "@/lib/storage/serverNotes";

// Reads/writes the durable store (Supabase on deploy, local file in dev) —
// never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const notes = await getServerNotesStore().get();
  return NextResponse.json({ notes });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { notes?: unknown };
  const notes = typeof body.notes === "string" ? body.notes : "";
  try {
    await getServerNotesStore().set(notes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed." },
      { status: 400 },
    );
  }
}
