import { NextResponse } from "next/server";
import { sanitizeCodes, type EditableScreeningFields } from "@/core/screening/types";
import { getServerScreeningStore } from "@/lib/storage/serverScreening";

// Writes the durable store (Supabase on deploy, local file in dev) — never
// statically cached.
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as EditableScreeningFields;
  const fields: EditableScreeningFields = {};
  if (typeof body.question === "string" && body.question.trim() !== "") {
    fields.question = body.question.trim();
  }
  // Answer may be cleared (question recorded, answer pending) — keep "".
  if (typeof body.answer === "string") fields.answer = body.answer.trim();
  if ("codes" in body) fields.codes = sanitizeCodes(body.codes);
  if (typeof body.draft === "boolean") fields.draft = body.draft;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }
  try {
    await getServerScreeningStore().update(id, fields);
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
  await getServerScreeningStore().remove(id);
  return NextResponse.json({ ok: true });
}
