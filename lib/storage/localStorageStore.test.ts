import { describe, expect, it } from "vitest";
import { LocalStorageRegistryStore, type KeyValueStorage } from "./localStorageStore";
import type { RegistryRow } from "../../core/registry/types";

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

function row(code: string): RegistryRow {
  return {
    code,
    company: "Acme",
    role: "UX/UI Designer",
    date: "2026-06-28",
    status: "Activo",
  };
}

describe("LocalStorageRegistryStore", () => {
  it("starts empty", async () => {
    const store = new LocalStorageRegistryStore(memoryStorage());
    expect(await store.list()).toEqual([]);
    expect(await store.existingCodes()).toEqual([]);
  });

  it("adds rows and lists them back", async () => {
    const store = new LocalStorageRegistryStore(memoryStorage());
    await store.add(row("0628a2"));
    await store.add(row("0628b3"));
    expect(await store.existingCodes()).toEqual(["0628a2", "0628b3"]);
  });

  it("rejects a duplicate code", async () => {
    const store = new LocalStorageRegistryStore(memoryStorage());
    await store.add(row("0628a2"));
    await expect(store.add(row("0628a2"))).rejects.toThrow(/already exists/);
  });

  it("updates only notes and status", async () => {
    const store = new LocalStorageRegistryStore(memoryStorage());
    await store.add(row("0628a2"));
    await store.update("0628a2", { notes: "2da entrevista", status: "Rechazado" });
    const [updated] = await store.list();
    expect(updated.notes).toBe("2da entrevista");
    expect(updated.status).toBe("Rechazado");
  });

  it("clears notes when updated to undefined", async () => {
    const store = new LocalStorageRegistryStore(memoryStorage());
    await store.add({ ...row("0628a2"), notes: "algo" });
    await store.update("0628a2", { notes: undefined });
    const [updated] = await store.list();
    expect(updated.notes).toBeUndefined();
  });

  it("throws when updating a missing code", async () => {
    const store = new LocalStorageRegistryStore(memoryStorage());
    await expect(store.update("nope12", { status: "Rechazado" })).rejects.toThrow(
      /No registry row/,
    );
  });

  it("persists across store instances sharing the same storage", async () => {
    const storage = memoryStorage();
    await new LocalStorageRegistryStore(storage).add(row("0628a2"));
    const reopened = new LocalStorageRegistryStore(storage);
    expect(await reopened.existingCodes()).toEqual(["0628a2"]);
  });
});
