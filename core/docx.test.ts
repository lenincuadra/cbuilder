import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { fillMaster, validateSlots } from "./docx";
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

async function readDocXml(docx: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  return zip.file("word/document.xml")!.async("string");
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

describe("fillMaster — slot injection (spike)", () => {
  it.each(["EN", "ES"] as const)(
    "leaves document.xml untouched when no slots are provided (%s)",
    async (lang) => {
      const master = loadMaster(lang);
      const links = buildTrackedLinks(TEST_SPEC, "0628r4");
      const baseDocXml = await readDocXml(master);
      const filled = await fillMaster(master, links);
      const filledDocXml = await readDocXml(filled);
      expect(filledDocXml).toBe(baseDocXml);
    },
  );

  it.each(["EN", "ES"] as const)(
    "injects title slot — new text appears, location line preserved (%s)",
    async (lang) => {
      const master = loadMaster(lang);
      const links = buildTrackedLinks(TEST_SPEC, "0628r4");
      const newTitle = "Lead UX Designer · Design Systems Specialist";
      const filled = await fillMaster(master, links, { title: newTitle });
      const docXml = await readDocXml(filled);

      expect(docXml).toContain(newTitle);
      // Original title text should be gone
      expect(docXml).not.toContain("Senior Product Designer");
      // Location line must still be there
      expect(docXml).toContain("Córdoba");
    },
  );

  it.each(["EN"] as const)(
    "injects summary slot — replaces summary text, preserves run formatting (%s)",
    async (lang) => {
      const master = loadMaster(lang);
      const links = buildTrackedLinks(TEST_SPEC, "0628r4");
      const newSummary =
        "10+ years building AI-powered design systems for enterprise SaaS at scale.";
      const filled = await fillMaster(master, links, { summary: newSummary });
      const docXml = await readDocXml(filled);

      expect(docXml).toContain(newSummary);
      // Original summary opening should be gone
      expect(docXml).not.toContain("6 years of experience");
      // Section header and rest of document must be intact
      expect(docXml).toContain("PROFESSIONAL SUMMARY");
      expect(docXml).toContain("EXPERIENCE");
    },
  );

  it("injects both slots independently in the same call", async () => {
    const master = loadMaster("EN");
    const links = buildTrackedLinks(TEST_SPEC, "0628r4");
    const slots = {
      title: "Product Manager · AI Strategy",
      summary: "Driving product vision at the intersection of AI and enterprise design.",
    };
    const filled = await fillMaster(master, links, slots);
    const docXml = await readDocXml(filled);

    expect(docXml).toContain(slots.title);
    expect(docXml).toContain(slots.summary);
    expect(docXml).not.toContain("Senior Product Designer");
    expect(docXml).not.toContain("6 years of experience");
    expect(docXml).toContain("Córdoba");
    expect(docXml).toContain("EXPERIENCE");
  });

  it("XML-escapes special characters in slot content", async () => {
    const master = loadMaster("EN");
    const links = buildTrackedLinks(TEST_SPEC, "0628r4");
    const slots = {
      title: "Designer & Strategist <Senior>",
      summary: 'Built tools for "enterprise" customers & partners.',
    };
    const filled = await fillMaster(master, links, slots);
    const docXml = await readDocXml(filled);

    // & and < must be XML-escaped in text nodes; " does not need escaping in text nodes
    expect(docXml).toContain("Designer &amp; Strategist &lt;Senior&gt;");
    // " is valid unescaped in XML text content
    expect(docXml).toContain('"enterprise"');
    expect(docXml).toContain("customers &amp; partners");
  });

  it("still correctly replaces the tracked links when slots are also provided", async () => {
    const master = loadMaster("EN");
    const links = buildTrackedLinks(TEST_SPEC, "0628r4", "payments");
    const filled = await fillMaster(master, links, { title: "New Title" });
    const rels = await readRels(filled);

    expect(rels).not.toContain("ref=li-cv");
    expect(rels).toContain(`Target="${links.portfolio}"`);
    expect(rels).toContain(`Target="${links.linkedin}"`);
    expect(rels).toContain(`Target="${links.github}"`);
  });
});

describe("validateSlots", () => {
  it.each(["EN", "ES"] as const)("current masters pass slot validation (%s)", async (lang) => {
    const errors = await validateSlots(loadMaster(lang));
    expect(errors).toHaveLength(0);
  });

  it("reports an error when the title color is missing", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<w:document><w:body><w:p><w:r><w:t>PROFESSIONAL SUMMARY</w:t></w:r></w:p><w:p><w:r><w:t>Summary text.</w:t></w:r></w:p></w:body></w:document>`,
    );
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const errors = await validateSlots(bytes);
    expect(errors.some((e) => e.includes("title"))).toBe(true);
  });

  it("reports an error when the summary header is missing", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<w:document><w:body><w:p><w:r><w:rPr><w:color w:val="1A56DB"/></w:rPr><w:t>Title</w:t></w:r></w:p></w:body></w:document>`,
    );
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const errors = await validateSlots(bytes);
    expect(errors.some((e) => e.includes("Summary"))).toBe(true);
  });
});
