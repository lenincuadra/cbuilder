import { promises as fs } from "node:fs";
import path from "node:path";
import type { EditableFields, RegistryRow, RegistryStore } from "@/core/registry/types";

// Local JSON file on disk — the durable source of truth for local use.
// Gitignored (see .gitignore) so private application data never reaches the repo.
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "registry.json");

/**
 * Server-side RegistryStore backed by a single JSON file. Used by the API
 * routes; the browser talks to it through ApiRegistryStore. One file per
 * machine, so every browser sees the same data (unlike per-browser localStorage).
 */
class FileRegistryStore implements RegistryStore {
  private async read(): Promise<RegistryRow[]> {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RegistryRow[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(rows: RegistryRow[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  }

  async list(): Promise<RegistryRow[]> {
    return this.read();
  }

  async add(row: RegistryRow): Promise<void> {
    const rows = await this.read();
    if (rows.some((existing) => existing.code === row.code)) {
      throw new Error(`A registry row with code "${row.code}" already exists.`);
    }
    rows.push(row);
    await this.write(rows);
  }

  async update(code: string, fields: EditableFields): Promise<void> {
    const rows = await this.read();
    const index = rows.findIndex((row) => row.code === code);
    if (index === -1) {
      throw new Error(`No registry row with code "${code}".`);
    }
    rows[index] = { ...rows[index], ...fields };
    await this.write(rows);
  }

  async existingCodes(): Promise<string[]> {
    return (await this.read()).map((row) => row.code);
  }
}

/** Shared server-side instance. */
export const fileStore = new FileRegistryStore();
