import { NextResponse } from "next/server";
import type { Language } from "@/core/types";
import { getServerPortfolioCvStore } from "@/lib/storage/serverPortfolioCv";

// Reads/writes the durable store (Supabase on deploy, local file in dev) —
// never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getServerPortfolioCvStore().get();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { language?: unknown; version?: unknown };
  const language: Language | null =
    body.language === "EN" || body.language === "ES" ? body.language : null;
  const version =
    typeof body.version === "number" && Number.isInteger(body.version) && body.version >= 0
      ? body.version
      : null;
  if (!language || version === null) {
    return NextResponse.json(
      { error: "language (EN|ES) y version (entero ≥ 0) requeridos." },
      { status: 400 },
    );
  }
  await getServerPortfolioCvStore().setPublished(language, version);
  return NextResponse.json({ ok: true }, { status: 201 });
}
