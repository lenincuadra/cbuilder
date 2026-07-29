import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildCvDocx } from "./docx";
import { cvDataFor } from "./index";
import type { TrackedLinks } from "../spec/links";

const LINKS: TrackedLinks = {
  portfolio: "lenincuadra.com/r/0628r4Pp",
  linkedin: "lenincuadra.com/r/0628r4L",
  github: "lenincuadra.com/r/0628r4G",
};

async function docXml(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  return zip.file("word/document.xml")!.async("string");
}

async function relsXml(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  return zip.file("word/_rels/document.xml.rels")!.async("string");
}

describe("buildCvDocx (base, no overrides)", () => {
  it("produces a valid zip with the expected parts", async () => {
    const bytes = await buildCvDocx(cvDataFor("EN"), LINKS);
    const zip = await JSZip.loadAsync(bytes);
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    expect(zip.file("word/document.xml")).toBeTruthy();
    expect(zip.file("word/_rels/document.xml.rels")).toBeTruthy();
  });

  it("includes the default title and every section header", async () => {
    const data = cvDataFor("EN");
    const xml = await docXml(await buildCvDocx(data, LINKS));
    expect(xml).toContain(data.title);
    for (const header of [
      data.sectionTitles.summary,
      data.sectionTitles.experience,
      data.sectionTitles.skills,
      data.sectionTitles.certifications,
      data.sectionTitles.education,
    ]) {
      expect(xml).toContain(header);
    }
  });

  it("renders every experience bullet and skill", async () => {
    const data = cvDataFor("EN");
    const xml = await docXml(await buildCvDocx(data, LINKS));
    for (const entry of data.experience) {
      expect(xml).toContain(entry.company);
      for (const b of entry.bullets) {
        // Text nodes are XML-escaped; check a distinctive escaped-safe fragment.
        expect(xml).toContain(b.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 40));
      }
    }
  });

  it("bakes the three tracked links as external hyperlink relationships", async () => {
    const rels = await relsXml(await buildCvDocx(cvDataFor("EN"), LINKS));
    expect(rels).toContain(LINKS.portfolio);
    expect(rels).toContain(LINKS.github);
    expect(rels).toContain(LINKS.linkedin);
    expect(rels).toContain('TargetMode="External"');
    const doc = await docXml(await buildCvDocx(cvDataFor("EN"), LINKS));
    expect(doc).toContain('<w:hyperlink r:id="rId1">');
    expect(doc).toContain('<w:hyperlink r:id="rId2">');
    expect(doc).toContain('<w:hyperlink r:id="rId3">');
  });

  it("does NOT include ATS sections when no overrides", async () => {
    const data = cvDataFor("EN");
    const xml = await docXml(await buildCvDocx(data, LINKS));
    expect(xml).not.toContain(data.sectionTitles.coreCompetencies);
    expect(xml).not.toContain(data.sectionTitles.valuesAlignment);
  });

  it("works for ES too", async () => {
    const data = cvDataFor("ES");
    const xml = await docXml(await buildCvDocx(data, LINKS));
    expect(xml).toContain(data.sectionTitles.summary); // "RESUMEN PROFESIONAL"
    expect(xml).toContain("Presente"); // ES dates
  });
});

describe("buildCvDocx (with JD overrides)", () => {
  it("replaces the title and summary", async () => {
    const data = cvDataFor("EN");
    const xml = await docXml(
      await buildCvDocx(data, LINKS, {
        title: "Staff Product Designer, Platform",
        summary: "Tailored summary for this specific role.",
      }),
    );
    expect(xml).toContain("Staff Product Designer, Platform");
    expect(xml).toContain("Tailored summary for this specific role.");
    expect(xml).not.toContain(data.title); // default headline gone
  });

  it("adds Core Competencies and Values Alignment sections", async () => {
    const data = cvDataFor("EN");
    const xml = await docXml(
      await buildCvDocx(data, LINKS, {
        coreCompetencies: ["Design Systems", "Figma", "Accessibility"],
        valuesAlignment: [{ value: "Bold", evidence: "Led AI adoption across a design team." }],
      }),
    );
    expect(xml).toContain(data.sectionTitles.coreCompetencies);
    expect(xml).toContain(data.sectionTitles.valuesAlignment);
    expect(xml).toContain("Design Systems · Figma · Accessibility");
    expect(xml).toContain("Bold");
  });
});
