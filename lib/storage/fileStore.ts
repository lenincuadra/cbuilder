import { promises as fs } from "node:fs";
import path from "node:path";
import type { EditableFields, RegistryRow, RegistryStore } from "@/core/registry/types";

// Local JSON file on disk — the durable source of truth for local use.
// Gitignored (see .gitignore) so private application data never reaches the repo.
const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "registry.json");

/**
 * Server-side RegistryStore backed by a single JSON file. Used by the API
 * routes; the browser talks to it through ApiRegistryStore. One file per
 * machine, so every browser sees the same data (unlike per-browser localStorage).
 *
 * Concurrency: every operation runs through a serial queue, so each
 * read-modify-write completes before the next starts — otherwise two requests
 * arriving together would both read the same snapshot and the last writer would
 * clobber the other's change (dropping rows). Writes go to a temp file and are
 * atomically renamed into place, so a concurrent reader never sees a half-written
 * file, and an interrupted write can't corrupt the real one.
 */
export class FileRegistryStore implements RegistryStore {
  private readonly dataFile: string;
  private readonly dataDir: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dataFile: string = DEFAULT_DATA_FILE) {
    this.dataFile = dataFile;
    this.dataDir = path.dirname(dataFile);
  }

  /** Run `op` after any in-flight operation settles, so access is serialized. */
  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const result = this.queue.then(op, op);
    // Keep the chain alive whether op resolves or rejects; swallow here so a
    // failed op doesn't turn into an unhandled rejection on the queue.
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async read(): Promise<RegistryRow[]> {
    try {
      const raw = await fs.readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RegistryRow[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      // Never swallow a parse error into []: writing that back would wipe the file.
      throw error;
    }
  }

  private async write(rows: RegistryRow[]): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tmp = `${this.dataFile}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.dataFile);
  }

  list(): Promise<RegistryRow[]> {
    return this.enqueue(() => this.read());
  }

  add(row: RegistryRow): Promise<void> {
    return this.enqueue(async () => {
      const rows = await this.read();
      if (rows.some((existing) => existing.code === row.code)) {
        throw new Error(`A registry row with code "${row.code}" already exists.`);
      }
      rows.push(row);
      await this.write(rows);
    });
  }

  update(code: string, fields: EditableFields): Promise<void> {
    return this.enqueue(async () => {
      const rows = await this.read();
      const index = rows.findIndex((row) => row.code === code);
      if (index === -1) {
        throw new Error(`No registry row with code "${code}".`);
      }
      // A cleared field arrives as null over the JSON API (JSON can't carry undefined);
      // apply it as undefined so the key drops out of the stored row.
      const next = { ...rows[index] } as Record<string, unknown>;
      for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
        next[key] = value === null ? undefined : value;
      }
      rows[index] = next as unknown as RegistryRow;
      await this.write(rows);
    });
  }

  remove(code: string): Promise<void> {
    return this.enqueue(async () => {
      const rows = await this.read();
      await this.write(rows.filter((row) => row.code !== code));
    });
  }

  existingCodes(): Promise<string[]> {
    return this.enqueue(async () => (await this.read()).map((row) => row.code));
  }
}

/** Shared server-side instance. */
export const fileStore = new FileRegistryStore();
