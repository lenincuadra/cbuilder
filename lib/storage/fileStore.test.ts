import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileRegistryStore } from "./fileStore";
import type { RegistryRow } from "../../core/registry/types";

let dir: string;
let store: FileRegistryStore;

function row(code: string, archived = false): RegistryRow {
  return { code, company: `Co ${code}`, role: "Designer", date: "2026-06-01", status: "Activo", archived };
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "cvb-filestore-"));
  store = new FileRegistryStore(path.join(dir, "registry.json"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("FileRegistryStore", () => {
  it("adds and lists rows", async () => {
    await store.add(row("0601a2"));
    await store.add(row("0601b3", true));
    expect((await store.list()).map((r) => r.code)).toEqual(["0601a2", "0601b3"]);
  });

  it("removes only the given code", async () => {
    await store.add(row("0601a2"));
    await store.add(row("0601b3", true));
    await store.remove("0601a2");
    expect((await store.list()).map((r) => r.code)).toEqual(["0601b3"]);
  });

  // The bug that dropped archived rows: concurrent read-modify-write clobbering.
  it("does not lose rows under concurrent writes", async () => {
    // Seed 10 rows (half archived).
    for (let i = 0; i < 10; i++) await store.add(row(`seed${i}`, i % 2 === 0));

    // Fire many overlapping operations at once: adds, updates, and a couple removes.
    const ops: Promise<unknown>[] = [];
    for (let i = 0; i < 20; i++) ops.push(store.add(row(`new${i}`)));
    for (let i = 0; i < 10; i++) ops.push(store.update(`seed${i}`, { notes: `n${i}` }));
    ops.push(store.remove("seed1"));
    ops.push(store.remove("seed3"));
    await Promise.all(ops);

    const rows = await store.list();
    // 10 seed - 2 removed + 20 new = 28, and the file must still be valid JSON.
    expect(rows).toHaveLength(28);
    // Archived seeds (even indices) survive; updates applied.
    expect(rows.find((r) => r.code === "seed0")?.archived).toBe(true);
    expect(rows.find((r) => r.code === "seed0")?.notes).toBe("n0");
    expect(rows.find((r) => r.code === "seed1")).toBeUndefined();
    // File on disk parses cleanly (no corruption from interleaved writes).
    const raw = await fs.readFile(path.join(dir, "registry.json"), "utf8");
    expect(JSON.parse(raw)).toHaveLength(28);
  });

  it("throws (does not wipe) when the file is corrupt", async () => {
    await fs.writeFile(path.join(dir, "registry.json"), "{ not json", "utf8");
    await expect(store.list()).rejects.toThrow();
  });
});
