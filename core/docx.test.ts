import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { fillMaster } from "./docx";

const RELS_PATH = "word/_rels/document.xml.rels";

function loadMaster(language: "EN" | "ES"): Uint8Array {
  return new Uint8Array(
    readFileSync(join(process.cwd(), "public", "masters", `${language}.docx`)),
  );
}

async function readRels(docx: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  return zip.file(RELS_PATH)!.async("string");
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("fillMaster", () => {
  it.each(["EN", "ES"] as const)(
    "inserts per-link ids (P portfolio, L linkedin, G github) in the %s master",
    async (lang) => {
      const filled = await fillMaster(loadMaster(lang), "0628r4");
      const rels = await readRels(filled);

      expect(rels).not.toContain("ref=li-cv");
      // Portfolio → <code>P (direct); LinkedIn → <code>L and GitHub → <code>G (via go.html).
      expect(rels).toContain("https://lenincuadra.com/?ref=0628r4P");
      expect(rels).toContain(
        "https://lenincuadra.com/go.html?ref=0628r4L&amp;dest=linkedin",
      );
      expect(rels).toContain(
        "https://lenincuadra.com/go.html?ref=0628r4G&amp;dest=github",
      );
      expect(countOccurrences(rels, "ref=0628r4P")).toBe(1);
      expect(countOccurrences(rels, "ref=0628r4L")).toBe(1);
      expect(countOccurrences(rels, "ref=0628r4G")).toBe(1);
    },
  );

  it("appends the focus profile to all links when given", async () => {
    const filled = await fillMaster(loadMaster("EN"), "0628r4", "payments");
    const rels = await readRels(filled);

    expect(rels).toContain("https://lenincuadra.com/?ref=0628r4P&amp;focus=payments");
    expect(rels).toContain(
      "https://lenincuadra.com/go.html?ref=0628r4L&amp;dest=linkedin&amp;focus=payments",
    );
    expect(rels).toContain(
      "https://lenincuadra.com/go.html?ref=0628r4G&amp;dest=github&amp;focus=payments",
    );
    expect(countOccurrences(rels, "focus=payments")).toBe(3);
  });

  it("throws when the relationships part is missing", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<xml/>");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    await expect(fillMaster(bytes, "0628r4")).rejects.toThrow(/missing/);
  });

  it("throws when the placeholder count is not exactly three", async () => {
    const zip = new JSZip();
    zip.file(RELS_PATH, '<Relationships><Relationship Target="ref=li-cv"/></Relationships>');
    const bytes = await zip.generateAsync({ type: "uint8array" });
    await expect(fillMaster(bytes, "0628r4")).rejects.toThrow(/exactly 3/);
  });
});
