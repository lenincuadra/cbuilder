import { NextResponse } from "next/server";
import { sanitizeBodies, type CoverLetterTemplate } from "@/core/coverLetter/types";
import { getServerCoverLetterTemplatesStore } from "@/lib/storage/serverCoverLetterTemplates";

// Reads/writes the durable store (Supabase on deploy, local file in dev) —
// never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await getServerCoverLetterTemplatesStore().list();
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CoverLetterTemplate>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const bodies = sanitizeBodies(body.bodies);
  if (id === "" || id.length > 64 || name === "" || Object.keys(bodies).length === 0) {
    return NextResponse.json(
      { error: "Template inválido: falta nombre o cuerpo (EN/ES)." },
      { status: 400 },
    );
  }
  try {
    await getServerCoverLetterTemplatesStore().add({
      id,
      name,
      bodies,
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
