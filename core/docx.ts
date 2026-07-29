import JSZip from "jszip";
import type { TrackedLinks } from "./spec/links";

/** Relationships part of the .docx where the header hyperlink URLs live. */
const RELS_PATH = "word/_rels/document.xml.rels";

/** Marker present in all three master link targets (portfolio + LinkedIn + GitHub). */
const PLACEHOLDER = "ref=li-cv";

/** Color attribute value of the CV title-line runs (bold blue in the header). */
const TITLE_COLOR = "1A56DB";

/**
 * Section header text used to locate the Professional Summary paragraph.
 * Matches both EN ("PROFESSIONAL SUMMARY") and ES ("RESUMEN PROFESIONAL") masters.
 */
const SUMMARY_HEADER_RE = /PROFESSIONAL SUMMARY|RESUMEN PROFESIONAL/i;

/** XML-escape a URL for a `Target="…"` attribute (short links rarely need it, but be safe). */
function xmlEscape(url: string): string {
  return url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** XML-escape arbitrary text content (for text nodes). */
function xmlEscapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Content injected into the CV body for tailored modes (2 and 3). Each field
 * is optional — absent fields leave the corresponding paragraph untouched.
 */
export interface ContentSlots {
  /**
   * Replaces the job-title line in the CV header
   * (e.g. "Senior Product Designer · AI Adoption Lead").
   * The location line ("Córdoba, Argentina…") is preserved unchanged.
   */
  title?: string;
  /**
   * Replaces the text of the Professional Summary paragraph. All other
   * formatting (font, weight, color, spacing) is preserved.
   */
  summary?: string;
}

/**
 * In the title paragraph, the "title" runs are distinguished by the
 * TITLE_COLOR. We keep those runs' rPr but consolidate them into one run
 * with the new text; the remaining runs (location line, lighter style) stay.
 */
function replaceTitleRuns(paraXml: string, newTitle: string): string {
  const runRe = /<w:r[ >][\s\S]*?<\/w:r>/g;
  const allRuns = paraXml.match(runRe) ?? [];
  if (allRuns.length === 0) return paraXml;

  const titleRuns = allRuns.filter((r) => r.includes(`w:val="${TITLE_COLOR}"`));
  const otherRuns = allRuns.filter((r) => !r.includes(`w:val="${TITLE_COLOR}"`));
  if (titleRuns.length === 0) return paraXml;

  const rPrMatch = titleRuns[0].match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
  const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : "";
  const newRun = `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscapeText(newTitle)}</w:t></w:r>`;

  const pPrMatch = paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : "";
  return `<w:p>${pPr}${newRun}${otherRuns.join("")}</w:p>`;
}

/**
 * Replace the text content of the Professional Summary paragraph. Preserves
 * the paragraph properties and first run's formatting; only the text changes.
 */
function replaceSummaryText(paraXml: string, newText: string): string {
  const pPrMatch = paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : "";
  const rPrMatch = paraXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
  const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : "";
  const newRun = `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscapeText(newText)}</w:t></w:r>`;
  return `<w:p>${pPr}${newRun}</w:p>`;
}

/**
 * Walk the document XML paragraph by paragraph and inject the provided slots.
 *
 * Identification strategy (no markers needed in the master):
 * - Title paragraph: first paragraph containing runs with `color=TITLE_COLOR`.
 * - Summary paragraph: first non-empty paragraph after the "PROFESSIONAL SUMMARY"
 *   (EN) / "RESUMEN PROFESIONAL" (ES) section header.
 *
 * This approach is robust to minor text edits in the master but relies on
 * the header's characteristic blue colour and section-header wording staying
 * stable — both of which are fundamental to the CV's visual identity.
 */
function applySlots(docXml: string, slots: ContentSlots): string {
  const paraRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let prevParaText = "";
  let summaryApplied = false;
  let titleApplied = false;

  for (const match of docXml.matchAll(paraRe)) {
    parts.push(docXml.slice(lastIndex, match.index!));
    let para = match[0];

    const textNodes = para.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [];
    const texts = textNodes
      .map((t) => t.replace(/<w:t[^>]*>|<\/w:t>/g, ""))
      .join("");

    if (slots.title && !titleApplied && para.includes(`w:val="${TITLE_COLOR}"`)) {
      para = replaceTitleRuns(para, slots.title);
      titleApplied = true;
    } else if (
      slots.summary &&
      !summaryApplied &&
      SUMMARY_HEADER_RE.test(prevParaText) &&
      texts.trim()
    ) {
      para = replaceSummaryText(para, slots.summary);
      summaryApplied = true;
    }

    if (texts.trim()) prevParaText = texts;
    parts.push(para);
    lastIndex = match.index! + match[0].length;
  }
  parts.push(docXml.slice(lastIndex));
  return parts.join("");
}

/**
 * Verify that the master document contains the structural elements required
 * for slot injection (modes 2 and 3). Returns a list of problems; an empty
 * list means the master is valid for slot use.
 *
 * Call this after any manual master edit, alongside the existing link validator,
 * to catch structural drift early.
 */
export async function validateSlots(masterBytes: Uint8Array | ArrayBuffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(masterBytes);
  const docFile = zip.file("word/document.xml");
  if (!docFile) return ["Missing word/document.xml"];

  const docXml = await docFile.async("string");
  const errors: string[] = [];

  if (!docXml.includes(`w:val="${TITLE_COLOR}"`)) {
    errors.push(
      `No title-line paragraph found: expected at least one run with color ${TITLE_COLOR}.`,
    );
  }
  if (!SUMMARY_HEADER_RE.test(docXml)) {
    errors.push(
      `No Professional Summary header found: expected "PROFESSIONAL SUMMARY" or "RESUMEN PROFESIONAL".`,
    );
  }

  return errors;
}

/**
 * Fill a master .docx with the real tracked links. The master keeps three
 * hyperlink targets marked with `ref=li-cv` (one plain = portfolio, one with
 * `dest=linkedin`, one with `dest=github`); each is replaced **whole** with the
 * corresponding link from the spec (short-link form), so the master file itself
 * never has to change when the URL format does.
 *
 * Optionally injects `slots` content into the CV body (title line and/or
 * professional summary) for the tailored CV modes (2 and 3). When `slots` is
 * absent or empty the document body is left untouched (mode 1 / base behaviour).
 *
 * Throws if the relationships part is missing, or if there aren't exactly three
 * markers with one LinkedIn and one GitHub (a malformed master).
 */
export async function fillMaster(
  masterBytes: Uint8Array | ArrayBuffer,
  links: TrackedLinks,
  slots?: ContentSlots,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(masterBytes);
  const relsFile = zip.file(RELS_PATH);
  if (!relsFile) {
    throw new Error(`Master is missing ${RELS_PATH}; cannot insert the tracked links.`);
  }

  const xml = await relsFile.async("string");
  const matches = [...xml.matchAll(/Target="([^"]*ref=li-cv[^"]*)"/g)];
  if (matches.length !== 3) {
    throw new Error(
      `Master must contain exactly 3 "${PLACEHOLDER}" hyperlink targets in ${RELS_PATH}; found ${matches.length}. The master looks malformed.`,
    );
  }

  let filled = xml;
  let linkedin = 0;
  let github = 0;
  for (const match of matches) {
    const [whole, value] = match;
    let url: string;
    if (value.includes("dest=linkedin")) {
      url = links.linkedin;
      linkedin += 1;
    } else if (value.includes("dest=github")) {
      url = links.github;
      github += 1;
    } else {
      url = links.portfolio;
    }
    filled = filled.replace(whole, `Target="${xmlEscape(url)}"`);
  }
  if (linkedin !== 1 || github !== 1) {
    throw new Error(
      `Master malformed: expected 1 LinkedIn and 1 GitHub target, found ${linkedin} / ${github}.`,
    );
  }

  zip.file(RELS_PATH, filled);

  // Slot injection for CV tailoring (modes 2/3). Only runs when slots are provided;
  // mode 1 (base) leaves the document.xml completely untouched.
  if (slots && (slots.title || slots.summary)) {
    const docFile = zip.file("word/document.xml");
    if (!docFile) {
      throw new Error("Master is missing word/document.xml; cannot inject content slots.");
    }
    const docXml = await docFile.async("string");
    zip.file("word/document.xml", applySlots(docXml, slots));
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
