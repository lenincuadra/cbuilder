import { promises as fs } from "node:fs";
import path from "node:path";
import type { EditableGeneralNoteFields, GeneralNote, GeneralNotesStore } from "@/core/notes/types";

// Local JSON array file on disk. Gitignored (see .gitignore, /data/) so
// private notes never reach the public repo, same as the registry file.
const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "notes.json");

/** The old single-document shape, from before notes became a list. */
interface LegacyNotesFile {
  notes?: unknown;
}

/**
 * Server-side GeneralNotesStore backed by a single JSON array file. Used by
 * the API routes; the browser talks to it through ApiGeneralNotesStore.
 *
 * Same discipline as FileRegistryStore: every operation runs through a serial
 * queue (read-modify-write stays atomic) and writes go to a temp file that is
 * atomically renamed into place, so a concurrent reader never sees a
 * half-written file and an interrupted write can't corrupt the real one.
 *
 * Transparently migrates the old `{ notes: "..." }` single-document shape
 * (from before notes became a list) into `[{ id: "legacy", title: "Notas",
 * body: notes }]` on first read, persisting the converted shape — no manual
 * step for local dev, and the real note content isn't lost.
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

  private async read(): Promise<GeneralNote[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.dataFile, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as GeneralNote[];

    // Legacy single-document shape — migrate in place.
    const legacy = parsed as LegacyNotesFile;
    const legacyNotes = typeof legacy.notes === "string" ? legacy.notes : "";
    if (legacyNotes === "") return [];
    const migrated: GeneralNote[] = [
      { id: "legacy", title: "Notas", body: legacyNotes, createdAt: new Date().toISOString() },
    ];
    await this.write(migrated);
    return migrated;
  }

  private async write(notes: GeneralNote[]): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tmp = `${this.dataFile}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(notes, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.dataFile);
  }

  list(): Promise<GeneralNote[]> {
    return this.enqueue(() => this.read());
  }

  add(note: GeneralNote): Promise<void> {
    return this.enqueue(async () => {
      const notes = await this.read();
      if (notes.some((existing) => existing.id === note.id)) {
        throw new Error(`Ya existe una nota con id "${note.id}".`);
      }
      notes.push(note);
      await this.write(notes);
    });
  }

  update(id: string, fields: EditableGeneralNoteFields): Promise<void> {
    return this.enqueue(async () => {
      const notes = await this.read();
      const index = notes.findIndex((note) => note.id === id);
      if (index === -1) {
        throw new Error(`No existe la nota "${id}".`);
      }
      notes[index] = { ...notes[index], ...fields, id: notes[index].id };
      await this.write(notes);
    });
  }

  remove(id: string): Promise<void> {
    return this.enqueue(async () => {
      const notes = await this.read();
      await this.write(notes.filter((note) => note.id !== id));
    });
  }
}

/** Shared server-side instance. */
export const fileNotesStore = new FileGeneralNotesStore();
