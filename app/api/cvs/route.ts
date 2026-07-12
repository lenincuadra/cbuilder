import { NextResponse } from "next/server";
import { isValidZipName, saveCvArchive } from "@/lib/storage/cvArchive";

// Writes a local file — never statically cached.
export const dynamic = "force-dynamic";

/** Archive a generated delivery zip (binary body, name in ?name=). */
export async function POST(request: Request) {
  // Local-first feature: on a deploy the filesystem is ephemeral, so archiving
  // there would silently lie. 501 = "feature off here" (same contract as gdocs);
  // the durable deploy copy is the Drive sink.
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "El archivo local (data/cvs) solo existe corriendo la app en tu Mac." },
      { status: 501 },
    );
  }
  const name = new URL(request.url).searchParams.get("name") ?? "";
  if (!isValidZipName(name)) {
    return NextResponse.json({ error: "Invalid zip name." }, { status: 400 });
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Empty body." }, { status: 400 });
  }
  try {
    await saveCvArchive(name, bytes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Archive failed." },
      { status: 500 },
    );
  }
}
