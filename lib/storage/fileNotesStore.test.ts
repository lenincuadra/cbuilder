import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileGeneralNotesStore } from "./fileNotesStore";

let dir: string;
let store: FileGeneralNotesStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "cvb-notesstore-"));
  store = new FileGeneralNotesStore(path.join(dir, "notes.json"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("FileGeneralNotesStore", () => {
  it("returns empty string when nothing was saved yet", async () => {
    expect(await store.get()).toBe("");
  });

  it("saves and reads back the notes", async () => {
    await store.set("## Pendientes\n- actualizar portfolio");
    expect(await store.get()).toBe("## Pendientes\n- actualizar portfolio");
  });

  it("clears the notes when set to empty string", async () => {
    await store.set("algo");
    await store.set("");
    expect(await store.get()).toBe("");
  });

  it("keeps the last write under concurrent sets", async () => {
    await Promise.all(Array.from({ length: 10 }, (_, i) => store.set(`v${i}`)));
    // Whatever wins, the file must be valid JSON with a string `notes`.
    const raw = await fs.readFile(path.join(dir, "notes.json"), "utf8");
    expect(typeof (JSON.parse(raw) as { notes: unknown }).notes).toBe("string");
  });

  it("throws (does not wipe) when the file is corrupt", async () => {
    await fs.writeFile(path.join(dir, "notes.json"), "{ not json", "utf8");
    await expect(store.get()).rejects.toThrow();
  });
});
