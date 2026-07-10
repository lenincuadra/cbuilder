import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { fillMaster } from "./docx";
import { buildTrackedLinks } from "./spec/links";
import { TEST_SPEC } from "./spec/testSpec";

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
    "replaces the three ref=li-cv targets with the built short links (%s)",
    async (lang) => {
      const links = buildTrackedLinks(TEST_SPEC, "0628r4", "payments");
      const filled = await fillMaster(loadMaster(lang), links);
      const rels = await readRels(filled);

      expect(rels).not.toContain("ref=li-cv");
      expect(rels).toContain(`Target="${links.portfolio}"`); // /r/0628r4Pp
      expect(rels).toContain(`Target="${links.linkedin}"`);
      expect(rels).toContain(`Target="${links.github}"`);
      expect(countOccurrences(rels, "/r/0628r4")).toBe(3);
    },
  );

  it("throws when the relationships part is missing", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<xml/>");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const links = buildTrackedLinks(TEST_SPEC, "0628r4");
    await expect(fillMaster(bytes, links)).rejects.toThrow(/missing/);
  });

  it("throws when the marker count is not exactly three", async () => {
    const zip = new JSZip();
    zip.file(RELS_PATH, '<Relationships><Relationship Target="x?ref=li-cv"/></Relationships>');
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const links = buildTrackedLinks(TEST_SPEC, "0628r4");
    await expect(fillMaster(bytes, links)).rejects.toThrow(/exactly 3/);
  });
});
