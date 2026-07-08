import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isValidZipName, saveCvArchive } from "./cvArchive";

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "cv-archive-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("isValidZipName", () => {
  it("accepts the generated naming shapes", () => {
    expect(isValidZipName("EN_globallogic_0628a2.zip")).toBe(true);
    expect(isValidZipName("globallogic_0628a2.zip")).toBe(true);
  });

  it("rejects traversal and junk", () => {
    for (const bad of ["../x.zip", "a/b.zip", ".hidden.zip", "x.txt", "", "x..zip"]) {
      expect(isValidZipName(bad), bad).toBe(false);
    }
  });
});

describe("saveCvArchive", () => {
  it("writes the bytes under the archive dir and overwrites on same name", async () => {
    const dir = tempDir();
    const target = await saveCvArchive("EN_acme_0628a2.zip", new Uint8Array([1, 2, 3]), dir);
    expect(readFileSync(target)).toEqual(Buffer.from([1, 2, 3]));

    await saveCvArchive("EN_acme_0628a2.zip", new Uint8Array([9]), dir);
    expect(readFileSync(target)).toEqual(Buffer.from([9]));
  });

  it("rejects invalid names", async () => {
    await expect(saveCvArchive("../evil.zip", new Uint8Array([1]), tempDir())).rejects.toThrow(
      /Invalid zip name/,
    );
  });
});
