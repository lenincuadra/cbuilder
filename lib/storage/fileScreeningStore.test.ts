import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sanitizeCodes } from "../../core/screening/types";
import { FileScreeningStore } from "./fileScreeningStore";

const dirs: string[] = [];

function tempStore(): FileScreeningStore {
  const dir = mkdtempSync(path.join(tmpdir(), "screening-"));
  dirs.push(dir);
  return new FileScreeningStore(path.join(dir, "screening-questions.json"));
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const ENTRY = {
  id: "q-1",
  question: "Project you are most proud of",
  answer: "The Mercado Libre checkout redesign…",
  codes: ["0712a2"],
};

describe("FileScreeningStore", () => {
  it("adds, lists, updates and removes entries", async () => {
    const store = tempStore();
    await store.add(ENTRY);
    expect(await store.list()).toEqual([ENTRY]);

    await store.update("q-1", { answer: "New answer", codes: ["0712a2", "0713b3"] });
    const [updated] = await store.list();
    expect(updated.answer).toBe("New answer");
    expect(updated.codes).toEqual(["0712a2", "0713b3"]);
    expect(updated.question).toBe(ENTRY.question);

    await store.remove("q-1");
    expect(await store.list()).toEqual([]);
  });

  it("rejects duplicate ids and updates to missing entries", async () => {
    const store = tempStore();
    await store.add(ENTRY);
    await expect(store.add(ENTRY)).rejects.toThrow(/Ya existe/);
    await expect(store.update("nope", { answer: "x" })).rejects.toThrow(/No existe/);
  });

  it("returns an empty list before the file exists", async () => {
    expect(await tempStore().list()).toEqual([]);
  });
});

describe("sanitizeCodes", () => {
  it("keeps trimmed unique strings and drops junk", () => {
    expect(sanitizeCodes([" 0712a2 ", "0712a2", "0713b3", "", 42, null])).toEqual([
      "0712a2",
      "0713b3",
    ]);
  });

  it("returns [] for non-arrays", () => {
    expect(sanitizeCodes("0712a2")).toEqual([]);
    expect(sanitizeCodes(undefined)).toEqual([]);
  });
});
