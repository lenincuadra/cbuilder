import { NextResponse } from "next/server";
import { isValidArchivePath } from "@/lib/storage/cvArchive";
import { getServerCvArchiveStore } from "@/lib/storage/serverCvArchive";

// Reads the durable archive — never statically cached.
export const dynamic = "force-dynamic";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Download one archived delivered file: GET /api/cvs/<folder>/<file>.docx.
 * Serves the faithful copy of what was sent (local data/cvs/ or Supabase
 * Storage) as an attachment, so a past CV is one tap away — also on a phone.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const store = getServerCvArchiveStore();
  if (!store) {
    return NextResponse.json(
      { error: "El archivo de CVs no está configurado acá (Supabase Storage)." },
      { status: 501 },
    );
  }
  const segments = (await params).path;
  const archivePath = segments.map((segment) => decodeURIComponent(segment)).join("/");
  if (!isValidArchivePath(archivePath)) {
    return NextResponse.json({ error: "Invalid archive path." }, { status: 400 });
  }
  try {
    const bytes = await store.read(archivePath);
    if (!bytes) {
      return NextResponse.json(
        { error: `${archivePath} no está en el archivo de CVs.` },
        { status: 404 },
      );
    }
    const filename = archivePath.split("/").pop() ?? "archivo.docx";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed." },
      { status: 500 },
    );
  }
}
