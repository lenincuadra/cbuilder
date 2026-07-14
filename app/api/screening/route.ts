import { NextResponse } from "next/server";
import { sanitizeCodes, type ScreeningQuestion } from "@/core/screening/types";
import { getServerScreeningStore } from "@/lib/storage/serverScreening";

// Reads/writes the durable store (Supabase on deploy, local file in dev) —
// never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await getServerScreeningStore().list();
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ScreeningQuestion>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const codes = sanitizeCodes(body.codes);
  if (id === "" || id.length > 64 || question === "") {
    return NextResponse.json({ error: "Pregunta inválida: falta el texto." }, { status: 400 });
  }
  try {
    await getServerScreeningStore().add({
      id,
      question,
      answer,
      codes,
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
