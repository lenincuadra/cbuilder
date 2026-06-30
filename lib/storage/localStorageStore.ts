import type {
  EditableFields,
  RegistryRow,
  RegistryStore,
} from "../../core/registry/types";

/** Minimal subset of the Web Storage API we depend on (injectable for tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_KEY = "cv-builder:registry";

/**
 * RegistryStore backed by a key-value storage (browser localStorage in the app,
 * an in-memory fake in tests). The whole registry is stored as a JSON array
 * under a single key.
 */
export class LocalStorageRegistryStore implements RegistryStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = DEFAULT_KEY,
  ) {}

  private read(): RegistryRow[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RegistryRow[]) : [];
    } catch {
      return [];
    }
  }

  private write(rows: RegistryRow[]): void {
    this.storage.setItem(this.key, JSON.stringify(rows));
  }

  async list(): Promise<RegistryRow[]> {
    return this.read();
  }

  async add(row: RegistryRow): Promise<void> {
    const rows = this.read();
    if (rows.some((existing) => existing.code === row.code)) {
      throw new Error(`A registry row with code "${row.code}" already exists.`);
    }
    rows.push(row);
    this.write(rows);
  }

  async update(code: string, fields: EditableFields): Promise<void> {
    const rows = this.read();
    const index = rows.findIndex((row) => row.code === code);
    if (index === -1) {
      throw new Error(`No registry row with code "${code}".`);
    }
    rows[index] = { ...rows[index], ...fields };
    this.write(rows);
  }

  async existingCodes(): Promise<string[]> {
    return this.read().map((row) => row.code);
  }
}
