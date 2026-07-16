import { NextResponse } from "next/server";
import type { GeneralNote } from "@/core/notes/types";
import { getServerNotesStore } from "@/lib/storage/serverNotes";

// Reads/writes the durable store (Supabase on deploy, local file in dev) —
// never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const notes = await getServerNotesStore().list();
  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<GeneralNote>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const noteBody = typeof body.body === "string" ? body.body : "";
  if (id === "" || id.length > 64 || title === "") {
    return NextResponse.json({ error: "Nota inválida: falta el título." }, { status: 400 });
  }
  try {
    await getServerNotesStore().add({
      id,
      title,
      body: noteBody,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Add failed." },
      { status: 409 },
    );
  }
}
