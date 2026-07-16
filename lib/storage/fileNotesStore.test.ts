import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileGeneralNotesStore } from "./fileNotesStore";

let dir: string;
let dataFile: string;
let store: FileGeneralNotesStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "cvb-notesstore-"));
  dataFile = path.join(dir, "notes.json");
  store = new FileGeneralNotesStore(dataFile);
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const NOTE = {
  id: "n-1",
  title: "Pendientes",
  body: "## Pendientes\n- actualizar portfolio",
};

describe("FileGeneralNotesStore", () => {
  it("returns an empty list before the file exists", async () => {
    expect(await store.list()).toEqual([]);
  });

  it("adds, lists, updates and removes notes", async () => {
    await store.add(NOTE);
    expect(await store.list()).toEqual([NOTE]);

    await store.update("n-1", { body: "New body" });
    const [updated] = await store.list();
    expect(updated.body).toBe("New body");
    expect(updated.title).toBe(NOTE.title);

    await store.remove("n-1");
    expect(await store.list()).toEqual([]);
  });

  it("rejects duplicate ids and updates to missing notes", async () => {
    await store.add(NOTE);
    await expect(store.add(NOTE)).rejects.toThrow(/Ya existe/);
    await expect(store.update("nope", { body: "x" })).rejects.toThrow(/No existe/);
  });

  it("keeps the last write under concurrent adds", async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => store.add({ id: `n-${i}`, title: `T${i}`, body: "" })),
    );
    expect(await store.list()).toHaveLength(10);
  });

  it("migrates the legacy single-document shape on first read", async () => {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify({ notes: "## Legacy\n- old note" }), "utf8");

    const migrated = await store.list();
    expect(migrated).toEqual([
      expect.objectContaining({ id: "legacy", title: "Notas", body: "## Legacy\n- old note" }),
    ]);

    // Persisted in the new shape — a second read doesn't re-migrate or duplicate.
    const raw = await fs.readFile(dataFile, "utf8");
    expect(Array.isArray(JSON.parse(raw))).toBe(true);
    expect(await store.list()).toHaveLength(1);
  });

  it("treats a legacy file with empty notes as an empty list", async () => {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify({ notes: "" }), "utf8");
    expect(await store.list()).toEqual([]);
  });

  it("throws (does not wipe) when the file is corrupt", async () => {
    await fs.writeFile(dataFile, "{ not json", "utf8");
    await expect(store.list()).rejects.toThrow();
  });
});
