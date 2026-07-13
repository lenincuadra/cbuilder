import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { CV_ARCHIVE_DIR, isValidArchivePath, isValidZipName } from "@/lib/storage/cvArchive";

// Talks to the local OS — never statically cached.
export const dynamic = "force-dynamic";

/**
 * Reveal an archived delivery in Finder (`open -R`): an archived file
 * (`<folder>/<file>.docx`) or a legacy zip name. Local-first feature: only
 * meaningful on the user's Mac — 501 elsewhere (deploys have no Finder).
 */
export async function POST(request: Request) {
  if (process.env.VERCEL || process.platform !== "darwin") {
    return NextResponse.json(
      { error: "Abrir en Finder solo funciona corriendo la app local en tu Mac (el archivo vive en data/cvs de esa máquina)." },
      { status: 501 },
    );
  }

  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name : "";
  if (!isValidZipName(name) && !isValidArchivePath(name)) {
    return NextResponse.json({ error: "Invalid archive name." }, { status: 400 });
  }

  const target = path.join(CV_ARCHIVE_DIR, name);
  try {
    await fs.access(target);
  } catch {
    return NextResponse.json(
      { error: `${name} no está en el archivo local (data/cvs).` },
      { status: 404 },
    );
  }

  try {
    await new Promise<void>((resolve, reject) => {
      execFile("open", ["-R", target], (error) => (error ? reject(error) : resolve()));
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not open Finder." },
      { status: 500 },
    );
  }
}
