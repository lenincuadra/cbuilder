import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  CoverLetterTemplate,
  CoverLetterTemplatesStore,
  EditableTemplateFields,
} from "@/core/coverLetter/types";

// Local JSON array file on disk. Gitignored (/data/) — template bodies are the
// user's own letter prose; same privacy discipline as the registry.
const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "cover-letter-templates.json");

/**
 * Server-side CoverLetterTemplatesStore backed by a single JSON array file.
 * Same concurrency discipline as FileRegistryStore: a serial queue makes each
 * read-modify-write atomic, and writes go through a temp file + rename.
 */
export class FileCoverLetterTemplatesStore implements CoverLetterTemplatesStore {
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

  private async read(): Promise<CoverLetterTemplate[]> {
    try {
      const raw = await fs.readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CoverLetterTemplate[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(templates: CoverLetterTemplate[]): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tmp = `${this.dataFile}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(templates, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.dataFile);
  }

  list(): Promise<CoverLetterTemplate[]> {
    return this.enqueue(() => this.read());
  }

  add(template: CoverLetterTemplate): Promise<void> {
    return this.enqueue(async () => {
      const templates = await this.read();
      if (templates.some((existing) => existing.id === template.id)) {
        throw new Error(`Ya existe un template con id "${template.id}".`);
      }
      templates.push(template);
      await this.write(templates);
    });
  }

  update(id: string, fields: EditableTemplateFields): Promise<void> {
    return this.enqueue(async () => {
      const templates = await this.read();
      const index = templates.findIndex((template) => template.id === id);
      if (index === -1) {
        throw new Error(`No existe el template "${id}".`);
      }
      templates[index] = { ...templates[index], ...fields, id: templates[index].id };
      await this.write(templates);
    });
  }

  remove(id: string): Promise<void> {
    return this.enqueue(async () => {
      const templates = await this.read();
      await this.write(templates.filter((template) => template.id !== id));
    });
  }
}

/** Shared server-side instance. */
export const fileCoverLetterTemplatesStore = new FileCoverLetterTemplatesStore();
