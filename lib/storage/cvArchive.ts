import { promises as fs } from "node:fs";
import path from "node:path";

// Local archive of delivered files: data/cvs/<folder>/<file>.docx. Gitignored
// (/data/), same privacy rule as the registry — company names never reach git.
export const CV_ARCHIVE_DIR = path.join(process.cwd(), "data", "cvs");

// One path segment: no separators, no leading dot — path traversal stays out.
const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Legacy zip archives (pre per-file layout) still live flat in data/cvs/;
// the Finder reveal keeps accepting their names.
const ZIP_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/;

export function isValidZipName(name: string): boolean {
  return ZIP_NAME_RE.test(name) && !name.includes("..");
}

/**
 * An archive path is exactly `<folder>/<file>.docx`, both segments from a
 * strict allowlist (never trust the client): the delivery folder name plus the
 * delivered file name, e.g. "EN_acme_0628r4/Lenin_Cuadra_CV.docx".
 */
export function isValidArchivePath(archivePath: string): boolean {
  const segments = archivePath.split("/");
  if (segments.length !== 2) return false;
  const [folder, file] = segments;
  return (
    SEGMENT_RE.test(folder) &&
    SEGMENT_RE.test(file) &&
    file.endsWith(".docx") &&
    !archivePath.includes("..")
  );
}

/**
 * Durable archive of the delivered files. Masters evolve over time (v13 →
 * v14 → …), so a past delivery cannot be regenerated identically — this
 * archive is the faithful record of what was actually sent, and the source
 * for re-downloading a CV later (GET /api/cvs/<path>).
 */
export interface CvArchiveStore {
  /** Persist one delivered file. Same-path writes overwrite (idempotent). */
  save(archivePath: string, bytes: Uint8Array): Promise<void>;
  /** Read one archived file; null when it isn't there. */
  read(archivePath: string): Promise<Uint8Array | null>;
}

/**
 * Local implementation: data/cvs/<folder>/<file>. Atomic tmp+rename write,
 * matching the registry/notes file stores.
 */
export class FileCvArchiveStore implements CvArchiveStore {
  constructor(private readonly dir: string = CV_ARCHIVE_DIR) {}

  private resolve(archivePath: string): string {
    if (!isValidArchivePath(archivePath)) {
      throw new Error(`Invalid archive path: ${JSON.stringify(archivePath)}`);
    }
    return path.join(this.dir, archivePath);
  }

  async save(archivePath: string, bytes: Uint8Array): Promise<void> {
    const target = this.resolve(archivePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, bytes);
    await fs.rename(tmp, target);
  }

  async read(archivePath: string): Promise<Uint8Array | null> {
    const target = this.resolve(archivePath);
    try {
      return new Uint8Array(await fs.readFile(target));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}
