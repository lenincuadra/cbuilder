import { promises as fs } from "node:fs";
import path from "node:path";
import type { Language } from "@/core/types";
import type { PortfolioCvState, PortfolioCvStore } from "@/core/portfolioCv/types";

// Local JSON file on disk. Gitignored (/data/) — follows the same discipline as
// the registry and stable-links stores.
const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "portfolio-cv.json");

/**
 * Server-side PortfolioCvStore backed by a single JSON object file. Same
 * concurrency discipline as the other file stores: a serial queue makes each
 * read-modify-write atomic, and writes go through a temp file + rename.
 */
export class FilePortfolioCvStore implements PortfolioCvStore {
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

  private async read(): Promise<PortfolioCvState> {
    try {
      const raw = await fs.readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as PortfolioCvState)
        : {};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }

  private async write(state: PortfolioCvState): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tmp = `${this.dataFile}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.dataFile);
  }

  get(): Promise<PortfolioCvState> {
    return this.enqueue(() => this.read());
  }

  setPublished(language: Language, version: number): Promise<void> {
    return this.enqueue(async () => {
      const state = await this.read();
      state[language] = { version, publishedAt: new Date().toISOString() };
      await this.write(state);
    });
  }
}

/** Shared server-side instance. */
export const filePortfolioCvStore = new FilePortfolioCvStore();
