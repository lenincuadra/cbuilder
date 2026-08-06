import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { generatePortfolioCv, WEB_CV_REF } from "./generatePortfolioCv";
import { TEST_SPEC } from "./spec/testSpec";
import type { Language } from "./types";

function masterLoader(): (language: Language) => Promise<Uint8Array> {
  return async (language) =>
    new Uint8Array(readFileSync(join(process.cwd(), "public", "masters", `${language}.docx`)));
}

async function relsXml(docx: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  return zip.file("word/_rels/document.xml.rels")!.async("string");
}

describe("generatePortfolioCv", () => {
  it("bakes the fixed web-cv tracked links (P/L/G) into the master(s)", async () => {
    const result = await generatePortfolioCv("Ambos", {
      spec: TEST_SPEC,
      loadMaster: masterLoader(),
    });

    // Short links, no focus (the public CV has no personalization).
    expect(result.links.portfolio).toBe(`${TEST_SPEC.base}r/${WEB_CV_REF}P`);
    expect(result.links.linkedin).toBe(`${TEST_SPEC.base}r/${WEB_CV_REF}L`);
    expect(result.links.github).toBe(`${TEST_SPEC.base}r/${WEB_CV_REF}G`);

    for (const language of ["EN", "ES"] as const) {
      const bytes = result.files[language];
      expect(bytes?.length ?? 0).toBeGreaterThan(0);
      const rels = await relsXml(bytes!);
      // The 3 `ref=li-cv` placeholders were replaced with the real web-cv links.
      expect(rels).not.toContain("ref=li-cv");
      expect(rels).toContain(`r/${WEB_CV_REF}P`);
      expect(rels).toContain(`r/${WEB_CV_REF}L`);
      expect(rels).toContain(`r/${WEB_CV_REF}G`);
    }
  });

  it("generates only the requested language", async () => {
    const result = await generatePortfolioCv("EN", { spec: TEST_SPEC, loadMaster: masterLoader() });
    expect(result.files.EN).toBeDefined();
    expect(result.files.ES).toBeUndefined();
  });

  it("refuses to generate when the spec does not reserve web-cv", async () => {
    const spec = {
      ...TEST_SPEC,
      tracking: {
        ...TEST_SPEC.tracking,
        reservedRefs: TEST_SPEC.tracking.reservedRefs.filter((ref) => ref !== WEB_CV_REF),
      },
    };
    await expect(
      generatePortfolioCv("EN", { spec, loadMaster: masterLoader() }),
    ).rejects.toThrow(/web-cv/);
  });
});
