import { promises as fs } from "node:fs";
import path from "node:path";
import type { GeneralNotesStore } from "@/core/notes/types";

// Local JSON file on disk: { "notes": "..." }. Gitignored (see .gitignore, /data/)
// so private notes never reach the public repo, same as the registry file.
const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "notes.json");

/**
 * Server-side GeneralNotesStore backed by a single JSON file. Used by the API
 * route; the browser talks to it through ApiGeneralNotesStore.
 *
 * Same discipline as FileRegistryStore: every operation runs through a serial
 * queue (read-modify-write stays atomic) and writes go to a temp file that is
 * atomically renamed into place, so a concurrent reader never sees a
 * half-written file and an interrupted write can't corrupt the real one.
 */
export class FileGeneralNotesStore implements GeneralNotesStore {
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
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async read(): Promise<string> {
    try {
      const raw = await fs.readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(raw) as { notes?: unknown };
      return typeof parsed.notes === "string" ? parsed.notes : "";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
      // Never swallow a parse error into "": writing that back would wipe the file.
      throw error;
    }
  }

  private async write(notes: string): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tmp = `${this.dataFile}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify({ notes }, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.dataFile);
  }

  get(): Promise<string> {
    return this.enqueue(() => this.read());
  }

  set(notes: string): Promise<void> {
    return this.enqueue(() => this.write(notes));
  }
}

/** Shared server-side instance. */
export const fileNotesStore = new FileGeneralNotesStore();
