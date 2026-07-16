import { NextResponse } from "next/server";
import type { EditableGeneralNoteFields } from "@/core/notes/types";
import { getServerNotesStore } from "@/lib/storage/serverNotes";

// Writes the durable store (Supabase on deploy, local file in dev) — never
// statically cached.
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as EditableGeneralNoteFields;
  const fields: EditableGeneralNoteFields = {};
  if (typeof body.title === "string" && body.title.trim() !== "") {
    fields.title = body.title.trim();
  }
  // Body may be cleared (title kept, content emptied) — keep "".
  if (typeof body.body === "string") fields.body = body.body;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }
  try {
    await getServerNotesStore().update(id, fields);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 404 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getServerNotesStore().remove(id);
  return NextResponse.json({ ok: true });
}
