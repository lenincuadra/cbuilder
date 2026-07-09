import { promises as fs } from "node:fs";
import path from "node:path";

// Local archive of generated delivery zips: data/cvs/<zipName>. Gitignored
// (/data/), same privacy rule as the registry — company names never reach git.
export const CV_ARCHIVE_DIR = path.join(process.cwd(), "data", "cvs");

// Zip names come from slugifyCompany + code, but never trust the client:
// a strict allowlist keeps path traversal out (no separators, no leading dot).
const ZIP_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/;

export function isValidZipName(name: string): boolean {
  return ZIP_NAME_RE.test(name) && !name.includes("..");
}

/**
 * Persist a generated delivery zip on disk. Masters evolve over time (v13 →
 * v14 → …), so a past delivery cannot be regenerated identically — this
 * archive is the faithful record of what was actually sent.
 *
 * Same-name writes overwrite (regenerating a preview twice is idempotent).
 * Atomic tmp+rename write, matching the registry/notes file stores.
 */
export async function saveCvArchive(
  name: string,
  bytes: Uint8Array,
  archiveDir: string = CV_ARCHIVE_DIR,
): Promise<string> {
  if (!isValidZipName(name)) {
    throw new Error(`Invalid zip name: ${JSON.stringify(name)}`);
  }
  await fs.mkdir(archiveDir, { recursive: true });
  const target = path.join(archiveDir, name);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, bytes);
  await fs.rename(tmp, target);
  return target;
}
