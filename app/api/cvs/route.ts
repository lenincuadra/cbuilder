import { NextResponse } from "next/server";
import { isValidArchivePath } from "@/lib/storage/cvArchive";
import { getServerCvArchiveStore } from "@/lib/storage/serverCvArchive";

// Writes to the durable archive — never statically cached.
export const dynamic = "force-dynamic";

/** Archive one delivered file (binary body, `<folder>/<file>.docx` in ?path=). */
export async function POST(request: Request) {
  const store = getServerCvArchiveStore();
  // 501 = "feature off here" (deploy without Supabase Storage) — same contract
  // as gdocs. The delivery itself (browser download) is never blocked by this.
  if (!store) {
    return NextResponse.json(
      { error: "El archivo de CVs no está configurado acá (Supabase Storage)." },
      { status: 501 },
    );
  }
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!isValidArchivePath(path)) {
    return NextResponse.json({ error: "Invalid archive path." }, { status: 400 });
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Empty body." }, { status: 400 });
  }
  try {
    await store.save(path, bytes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Archive failed." },
      { status: 500 },
    );
  }
}
