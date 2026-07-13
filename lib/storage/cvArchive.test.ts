import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileCvArchiveStore, isValidArchivePath, isValidZipName } from "./cvArchive";

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

describe("isValidArchivePath", () => {
  it("accepts delivered file paths", () => {
    expect(isValidArchivePath("EN_globallogic_0628a2/Lenin_Cuadra_CV.docx")).toBe(true);
    expect(isValidArchivePath("ES_acme_0628a2/Lenin_Cuadra_Cover_Letter.docx")).toBe(true);
  });

  it("rejects traversal, wrong depth and non-docx", () => {
    for (const bad of [
      "../evil/x.docx",
      "folder/../x.docx",
      "x.docx",
      "a/b/c.docx",
      "folder/.hidden.docx",
      "folder/x.zip",
      "folder/",
      "/x.docx",
      "",
    ]) {
      expect(isValidArchivePath(bad), bad).toBe(false);
    }
  });
});

describe("FileCvArchiveStore", () => {
  it("writes under <folder>/<file>, overwrites on same path, reads back", async () => {
    const dir = tempDir();
    const store = new FileCvArchiveStore(dir);
    const archivePath = "EN_acme_0628a2/Lenin_Cuadra_CV.docx";

    await store.save(archivePath, new Uint8Array([1, 2, 3]));
    expect(readFileSync(path.join(dir, archivePath))).toEqual(Buffer.from([1, 2, 3]));

    await store.save(archivePath, new Uint8Array([9]));
    expect(await store.read(archivePath)).toEqual(new Uint8Array([9]));
  });

  it("returns null for a file that is not there", async () => {
    const store = new FileCvArchiveStore(tempDir());
    expect(await store.read("EN_acme_0628a2/Lenin_Cuadra_CV.docx")).toBeNull();
  });

  it("rejects invalid paths on save and read", async () => {
    const store = new FileCvArchiveStore(tempDir());
    await expect(store.save("../evil.docx", new Uint8Array([1]))).rejects.toThrow(
      /Invalid archive path/,
    );
    await expect(store.read("a/b/c.docx")).rejects.toThrow(/Invalid archive path/);
  });
});
