import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  EditableScreeningFields,
  ScreeningQuestion,
  ScreeningStore,
} from "@/core/screening/types";

// Local JSON array file on disk. Gitignored (/data/) — the answers are the
// user's own prose about real applications; same privacy discipline as the
// registry.
const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "screening-questions.json");

/**
 * Server-side ScreeningStore backed by a single JSON array file. Same
 * concurrency discipline as FileRegistryStore: a serial queue makes each
 * read-modify-write atomic, and writes go through a temp file + rename.
 */
export class FileScreeningStore implements ScreeningStore {
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

  private async read(): Promise<ScreeningQuestion[]> {
    try {
      const raw = await fs.readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ScreeningQuestion[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(entries: ScreeningQuestion[]): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tmp = `${this.dataFile}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.dataFile);
  }

  list(): Promise<ScreeningQuestion[]> {
    return this.enqueue(() => this.read());
  }

  add(entry: ScreeningQuestion): Promise<void> {
    return this.enqueue(async () => {
      const entries = await this.read();
      if (entries.some((existing) => existing.id === entry.id)) {
        throw new Error(`Ya existe una pregunta con id "${entry.id}".`);
      }
      entries.push(entry);
      await this.write(entries);
    });
  }

  update(id: string, fields: EditableScreeningFields): Promise<void> {
    return this.enqueue(async () => {
      const entries = await this.read();
      const index = entries.findIndex((entry) => entry.id === id);
      if (index === -1) {
        throw new Error(`No existe la pregunta "${id}".`);
      }
      entries[index] = { ...entries[index], ...fields, id: entries[index].id };
      await this.write(entries);
    });
  }

  remove(id: string): Promise<void> {
    return this.enqueue(async () => {
      const entries = await this.read();
      await this.write(entries.filter((entry) => entry.id !== id));
    });
  }
}

/** Shared server-side instance. */
export const fileScreeningStore = new FileScreeningStore();
