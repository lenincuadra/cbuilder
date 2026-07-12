import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildCoverLetterDocx, formatLetterDate } from "./docx";
import { resolveTemplateVars } from "./types";

async function documentXml(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const file = zip.file("word/document.xml");
  expect(file).not.toBeNull();
  return file!.async("string");
}

const DATE = new Date(2026, 6, 11); // 2026-07-11 local time

describe("buildCoverLetterDocx", () => {
  it("produces a valid docx package with the EN letterhead", async () => {
    const bytes = await buildCoverLetterDocx({
      language: "EN",
      bodyMarkdown: "Dear team,\n\nI am excited to apply.",
      date: DATE,
    });
    const zip = await JSZip.loadAsync(bytes);
    expect(zip.file("[Content_Types].xml")).not.toBeNull();
    expect(zip.file("_rels/.rels")).not.toBeNull();
    const xml = await documentXml(bytes);
    expect(xml).toContain("Lenin Cuadra");
    expect(xml).toContain("AI Adoption Lead");
    expect(xml).toContain("hi@lenincuadra.com");
    expect(xml).toContain("July 11, 2026");
  });

  it("uses the ES letterhead for ES letters", async () => {
    const xml = await documentXml(
      await buildCoverLetterDocx({ language: "ES", bodyMarkdown: "Hola.", date: DATE }),
    );
    expect(xml).toContain("Líder de Adopción de IA");
    expect(xml).toContain("hola@lenincuadra.com");
    expect(xml).toContain("11 de julio de 2026");
    expect(xml).not.toContain("hi@lenincuadra.com");
  });

  it("renders paragraphs, line breaks, bold and italic", async () => {
    const xml = await documentXml(
      await buildCoverLetterDocx({
        language: "EN",
        bodyMarkdown: "First **bold** and *italic*.\nSecond line.\n\nNew paragraph.",
        date: DATE,
      }),
    );
    // Bold and italic become their own runs with the right props.
    expect(xml).toMatch(/<w:b\/><w:color w:val="374151"\/><\/w:rPr><w:t xml:space="preserve">bold<\/w:t>/);
    expect(xml).toMatch(/<w:i\/><w:color w:val="374151"\/><\/w:rPr><w:t xml:space="preserve">italic<\/w:t>/);
    // Single newline inside a paragraph is a <w:br/>, not a new paragraph.
    expect(xml).toContain("<w:r><w:br/></w:r>");
    expect(xml).toContain("New paragraph.");
  });

  it("renders '-' lists as bullet paragraphs", async () => {
    const xml = await documentXml(
      await buildCoverLetterDocx({
        language: "EN",
        bodyMarkdown: "Highlights:\n\n- Shipped X\n- Led Y",
        date: DATE,
      }),
    );
    expect(xml).toContain("•  ");
    expect(xml).toContain("Shipped X");
    expect(xml).toContain(`<w:ind w:left="360"/>`);
  });

  it("escapes XML-sensitive characters in the body", async () => {
    const xml = await documentXml(
      await buildCoverLetterDocx({
        language: "EN",
        bodyMarkdown: "Design & AI <systems> at scale.",
        date: DATE,
      }),
    );
    expect(xml).toContain("Design &amp; AI &lt;systems&gt; at scale.");
    expect(xml).not.toContain("<systems>");
  });

  it("rejects an empty body", async () => {
    await expect(
      buildCoverLetterDocx({ language: "EN", bodyMarkdown: "   \n ", date: DATE }),
    ).rejects.toThrow(/empty/i);
  });
});

describe("formatLetterDate", () => {
  it("localizes per language", () => {
    expect(formatLetterDate(DATE, "EN")).toBe("July 11, 2026");
    expect(formatLetterDate(DATE, "ES")).toBe("11 de julio de 2026");
  });
});

describe("resolveTemplateVars", () => {
  it("replaces the known variables", () => {
    const body = "Dear {who}, I want the {role} role at {company}.";
    expect(
      resolveTemplateVars(body, { who: "Ana", role: "Product Designer", company: "Acme" }),
    ).toBe("Dear Ana, I want the Product Designer role at Acme.");
  });

  it("resolves missing values to empty and leaves unknown braces alone", () => {
    expect(resolveTemplateVars("Hi {who}, re {company}. Keep {this}.", { company: "Acme" })).toBe(
      "Hi , re Acme. Keep {this}.",
    );
  });
});
