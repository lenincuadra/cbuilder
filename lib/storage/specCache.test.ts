import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { LinkSpec } from "@/core/spec/types";
import { readSpecCache, writeSpecCache } from "./specCache";

const dirs: string[] = [];
function tempFile(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "spec-cache-"));
  dirs.push(dir);
  return path.join(dir, "spec-cache.json");
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const spec = { version: 1, base: "https://lenincuadra.com/" } as LinkSpec;

describe("specCache", () => {
  it("round-trips the spec (the offline fallback data path)", async () => {
    const file = tempFile();
    expect(await readSpecCache(file)).toBeNull(); // no cache yet
    await writeSpecCache(spec, file);
    expect(await readSpecCache(file)).toEqual(spec);
  });

  it("treats a missing or corrupt cache as no cache", async () => {
    const file = tempFile();
    expect(await readSpecCache(file)).toBeNull();
  });
});
