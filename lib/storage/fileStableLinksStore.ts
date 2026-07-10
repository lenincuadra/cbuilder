import { promises as fs } from "node:fs";
import path from "node:path";
import type { StableLink, StableLinksStore } from "@/core/stableLinks/types";

// Local JSON file on disk. Gitignored (/data/) — no private data here really,
// but it lives alongside the registry and follows the same discipline.
const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "stable-links.json");

/**
 * Server-side StableLinksStore backed by a single JSON array file. Same
 * concurrency discipline as FileRegistryStore: a serial queue makes each
 * read-modify-write atomic, and writes go through a temp file + rename.
 */
export class FileStableLinksStore implements StableLinksStore {
  private readonly dataFile: string;
  private readonly dataDir: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dataFile: string = DEFAULT_DATA_FILE) {
    this.dataFile = dataFile;
    this.dataDir = path.dirname(dataFile);
  }

  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const result = this.queue.then(op, op);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async read(): Promise<StableLink[]> {
    try {
      const raw = await fs.readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StableLink[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(links: StableLink[]): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tmp = `${this.dataFile}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(links, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.dataFile);
  }

  list(): Promise<StableLink[]> {
    return this.enqueue(() => this.read());
  }

  add(link: StableLink): Promise<void> {
    return this.enqueue(async () => {
      const links = await this.read();
      if (links.some((existing) => existing.ref === link.ref)) {
        throw new Error(`Ya existe un link estable con ref "${link.ref}".`);
      }
      links.push(link);
      await this.write(links);
    });
  }

  remove(ref: string): Promise<void> {
    return this.enqueue(async () => {
      const links = await this.read();
      await this.write(links.filter((link) => link.ref !== ref));
    });
  }
}

/** Shared server-side instance. */
export const fileStableLinksStore = new FileStableLinksStore();
