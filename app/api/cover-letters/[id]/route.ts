import { NextResponse } from "next/server";
import { sanitizeBodies, type EditableTemplateFields } from "@/core/coverLetter/types";
import { getServerCoverLetterTemplatesStore } from "@/lib/storage/serverCoverLetterTemplates";

// Writes the durable store (Supabase on deploy, local file in dev) — never
// statically cached.
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as EditableTemplateFields;
  const fields: EditableTemplateFields = {};
  if (typeof body.name === "string" && body.name.trim() !== "") fields.name = body.name.trim();
  if ("bodies" in body) {
    const bodies = sanitizeBodies(body.bodies);
    if (Object.keys(bodies).length === 0) {
      return NextResponse.json({ error: "El template necesita al menos un cuerpo." }, { status: 400 });
    }
    fields.bodies = bodies;
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }
  try {
    await getServerCoverLetterTemplatesStore().update(id, fields);
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
  await getServerCoverLetterTemplatesStore().remove(id);
  return NextResponse.json({ ok: true });
}
