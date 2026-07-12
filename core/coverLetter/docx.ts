import JSZip from "jszip";
import type { Language } from "../types";

/** The delivered letter file name is always generic — no tracking data in it. */
export const COVER_LETTER_FILENAME = "Lenin_Cuadra_Cover_Letter.docx";

// Document palette + typography, mirroring the CV masters (Arial; sizes in
// half-points): titles 111827, accent 1A56DB, body 374151, muted 6B7280.
const FONT = `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>`;

interface RunStyle {
  /** Font size in half-points (docx convention: 20 = 10pt). */
  size: number;
  /** Hex color without "#". */
  color: string;
  bold?: boolean;
  italic?: boolean;
}

const BODY: RunStyle = { size: 20, color: "374151" };

/** Per-language letterhead texts. Emails follow the masters: hi@ EN, hola@ ES. */
const LETTERHEAD: Record<Language, { subtitle: string; contact: string; locale: string }> = {
  EN: {
    subtitle: "Senior Product Designer  ·  AI Adoption Lead",
    contact: "hi@lenincuadra.com  ·  +549 351-376-6049",
    locale: "en-US",
  },
  ES: {
    subtitle: "Senior Product Designer  ·  Líder de Adopción de IA",
    contact: "hola@lenincuadra.com  ·  +549 351-376-6049",
    locale: "es-AR",
  },
};

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function run(text: string, style: RunStyle): string {
  const props =
    FONT +
    `<w:sz w:val="${style.size}"/><w:szCs w:val="${style.size}"/>` +
    (style.bold ? "<w:b/>" : "") +
    (style.italic ? "<w:i/>" : "") +
    `<w:color w:val="${style.color}"/>`;
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

const LINE_BREAK = "<w:r><w:br/></w:r>";

// Inline markdown: **bold** and *italic* (no nesting — enough for letters).
const INLINE_TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

function inlineRuns(text: string, base: RunStyle): string {
  return text
    .split(INLINE_TOKEN)
    .filter((part) => part !== "")
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return run(part.slice(2, -2), { ...base, bold: true });
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return run(part.slice(1, -1), { ...base, italic: true });
      }
      return run(part, base);
    })
    .join("");
}

/**
 * Render the letter body markdown into docx paragraphs. Supported: paragraphs
 * (blank-line separated), single line breaks within a paragraph, "- " bullet
 * lists, **bold** and *italic*. Deliberately minimal — a letter, not a document.
 */
function bodyParagraphs(markdown: string): string {
  const blocks = markdown.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    if (lines.length === 0) continue;
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      for (const line of lines) {
        const item = line.replace(/^[-*]\s+/, "");
        out.push(
          `<w:p><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/><w:ind w:left="360"/></w:pPr>` +
            run("•  ", BODY) +
            inlineRuns(item, BODY) +
            `</w:p>`,
        );
      }
      continue;
    }
    const content = lines.map((line) => inlineRuns(line, BODY)).join(LINE_BREAK);
    out.push(
      `<w:p><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr>${content}</w:p>`,
    );
  }
  return out.join("");
}

/** Localized long date for the letter ("July 11, 2026" / "11 de julio de 2026"). */
export function formatLetterDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(LETTERHEAD[language].locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function letterheadParagraphs(language: Language, date: Date): string {
  const texts = LETTERHEAD[language];
  return (
    `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>` +
    run("Lenin Cuadra", { size: 52, color: "111827", bold: true }) +
    `</w:p>` +
    `<w:p><w:pPr><w:spacing w:after="20"/></w:pPr>` +
    run(texts.subtitle, { size: 24, color: "1A56DB", bold: true }) +
    `</w:p>` +
    `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>` +
    run(texts.contact, { size: 18, color: "6B7280" }) +
    `</w:p>` +
    `<w:p><w:pPr><w:spacing w:before="240" w:after="240"/></w:pPr>` +
    run(formatLetterDate(date, language), BODY) +
    `</w:p>`
  );
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `</Relationships>`;

export interface BuildCoverLetterInput {
  language: Language;
  /** Final markdown body — variables already resolved (and edited) upstream. */
  bodyMarkdown: string;
  /** Letter date (the application date). */
  date: Date;
}

/**
 * Build the complete cover letter .docx: programmatic letterhead (name, role,
 * contact, localized date — same palette as the CV masters, no tracked links)
 * plus the rendered markdown body. No master file involved: generating the
 * letterhead in code sidesteps the known placeholder-stripping problem of
 * hand-edited masters; a designed master could replace this behind the same
 * signature later.
 */
export async function buildCoverLetterDocx(input: BuildCoverLetterInput): Promise<Uint8Array> {
  if (!input.bodyMarkdown.trim()) {
    throw new Error("Cover letter body is empty.");
  }
  const document =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
    letterheadParagraphs(input.language, input.date) +
    bodyParagraphs(input.bodyMarkdown) +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>` +
    `</w:body></w:document>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("word/document.xml", document);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
