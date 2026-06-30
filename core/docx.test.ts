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
    "replaces both placeholders in the %s master",
    async (lang) => {
      const filled = await fillMaster(loadMaster(lang), "0628r4");
      const rels = await readRels(filled);

      expect(rels).not.toContain("ref=li-cv");
      expect(countOccurrences(rels, "ref=0628r4")).toBe(2);
      // Both header links survive with the real code (portfolio direct, LinkedIn via go.html).
      expect(rels).toContain("https://lenincuadra.github.io/portfolio/?ref=0628r4");
      expect(rels).toContain(
        "https://lenincuadra.github.io/portfolio/go.html?ref=0628r4&amp;dest=linkedin",
      );
    },
  );

  it("throws when the relationships part is missing", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<xml/>");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    await expect(fillMaster(bytes, "0628r4")).rejects.toThrow(/missing/);
  });

  it("throws when the placeholder count is not exactly two", async () => {
    const zip = new JSZip();
    zip.file(RELS_PATH, '<Relationships><Relationship Target="ref=li-cv"/></Relationships>');
    const bytes = await zip.generateAsync({ type: "uint8array" });
    await expect(fillMaster(bytes, "0628r4")).rejects.toThrow(/exactly 2/);
  });
});
