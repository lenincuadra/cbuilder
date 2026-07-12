import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import { FileCoverLetterTemplatesStore } from "./fileCoverLetterTemplatesStore";

let dir: string;
let store: FileCoverLetterTemplatesStore;

const TEMPLATE: CoverLetterTemplate = {
  id: "t-1",
  name: "Fintech",
  bodies: { EN: "Dear {who}, I want to join {company}." },
  createdAt: "2026-07-11T12:00:00.000Z",
};

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "cl-templates-"));
  store = new FileCoverLetterTemplatesStore(path.join(dir, "templates.json"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FileCoverLetterTemplatesStore", () => {
  it("starts empty and round-trips a template", async () => {
    expect(await store.list()).toEqual([]);
    await store.add(TEMPLATE);
    expect(await store.list()).toEqual([TEMPLATE]);
  });

  it("rejects a duplicate id", async () => {
    await store.add(TEMPLATE);
    await expect(store.add(TEMPLATE)).rejects.toThrow(/Ya existe/);
  });

  it("updates name and bodies but never the id", async () => {
    await store.add(TEMPLATE);
    await store.update("t-1", { name: "Payments", bodies: { ES: "Hola {who}." } });
    const [updated] = await store.list();
    expect(updated).toMatchObject({ id: "t-1", name: "Payments", bodies: { ES: "Hola {who}." } });
  });

  it("throws when updating a missing template", async () => {
    await expect(store.update("nope", { name: "X" })).rejects.toThrow(/No existe/);
  });

  it("removes by id", async () => {
    await store.add(TEMPLATE);
    await store.remove("t-1");
    expect(await store.list()).toEqual([]);
  });
});
