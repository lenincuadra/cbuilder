import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { CV_ARCHIVE_DIR, isValidZipName } from "@/lib/storage/cvArchive";

// Talks to the local OS — never statically cached.
export const dynamic = "force-dynamic";

/**
 * Reveal an archived delivery zip in Finder (`open -R`). Local-first feature:
 * only meaningful on the user's Mac — 501 elsewhere (deploys have no Finder).
 */
export async function POST(request: Request) {
  if (process.platform !== "darwin") {
    return NextResponse.json({ error: "Finder reveal is only available on macOS." }, { status: 501 });
  }

  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name : "";
  if (!isValidZipName(name)) {
    return NextResponse.json({ error: "Invalid zip name." }, { status: 400 });
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
