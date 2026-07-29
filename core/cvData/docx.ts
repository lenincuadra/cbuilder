import JSZip from "jszip";
import type { TrackedLinks } from "../spec/links";
import type { CvData, ExperienceEntry } from "./types";

/**
 * Builds a complete CV .docx from structured `CvData` — the "ATS máximo" mode.
 * Unlike `fillMaster` (which edits the master and swaps 3 link targets), this
 * assembles the whole document programmatically, so the body content is fully
 * controlled per application. ATS-safe by construction: single column, Arial,
 * standard bullets, no tables / text boxes / images.
 *
 * The three tracked links are baked as real hyperlinks (display = clean domain,
 * href = tracked short URL), matching the master's behaviour.
 */

// Same palette + typography as the masters and the cover letter (Arial; sizes
// in half-points: 20 = 10pt). Titles 111827, accent 1A56DB, body 374151, muted 6B7280.
const FONT = `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>`;

interface RunStyle {
  size: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
}

const NAME: RunStyle = { size: 40, color: "111827", bold: true };
const HEADLINE: RunStyle = { size: 24, color: "1A56DB", bold: true };
const MUTED: RunStyle = { size: 18, color: "6B7280" };
const LINK: RunStyle = { size: 18, color: "1A56DB" };
const SECTION: RunStyle = { size: 22, color: "111827", bold: true };
const ROLE: RunStyle = { size: 20, color: "111827", bold: true };
const BODY: RunStyle = { size: 20, color: "374151" };
const CONTEXT: RunStyle = { size: 19, color: "6B7280", italic: true };

/** Content width in twips: page 12240 − left 1080 − right 1080. Used for the right date tab. */
const RIGHT_TAB = 10080;

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function runProps(style: RunStyle): string {
  return (
    FONT +
    `<w:sz w:val="${style.size}"/><w:szCs w:val="${style.size}"/>` +
    (style.bold ? "<w:b/>" : "") +
    (style.italic ? "<w:i/>" : "") +
    `<w:color w:val="${style.color}"/>`
  );
}

function run(text: string, style: RunStyle): string {
  return `<w:r><w:rPr>${runProps(style)}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

/** A clickable hyperlink run (rId points into word/_rels/document.xml.rels). */
function hyperlink(rId: string, text: string, style: RunStyle): string {
  return `<w:hyperlink r:id="${rId}"><w:r><w:rPr>${runProps(style)}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:hyperlink>`;
}

/** A paragraph with optional spacing (twips) after and before. */
function para(inner: string, opts: { after?: number; before?: number; tabRight?: boolean } = {}): string {
  const spacing = `<w:spacing w:after="${opts.after ?? 0}"${opts.before ? ` w:before="${opts.before}"` : ""} w:line="264" w:lineRule="auto"/>`;
  const tabs = opts.tabRight ? `<w:tabs><w:tab w:val="right" w:pos="${RIGHT_TAB}"/></w:tabs>` : "";
  return `<w:p><w:pPr>${tabs}${spacing}</w:pPr>${inner}</w:p>`;
}

/** A section header ("PROFESSIONAL SUMMARY") with a thin bottom rule. */
function sectionHeader(title: string): string {
  const border = `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="D1D5DB"/></w:pBdr>`;
  return `<w:p><w:pPr>${border}<w:spacing w:before="220" w:after="100" w:line="264" w:lineRule="auto"/></w:pPr>${run(title, SECTION)}</w:p>`;
}

/** A bullet paragraph (standard "•", indented — ATS-safe). */
function bullet(text: string): string {
  return (
    `<w:p><w:pPr><w:spacing w:after="40" w:line="264" w:lineRule="auto"/><w:ind w:left="288" w:hanging="288"/></w:pPr>` +
    run("•  ", BODY) +
    run(text, BODY) +
    `</w:p>`
  );
}

/** A JD-themed experience group (thematic structure): a JD header + real bullets under it. */
export interface ThematicGroup {
  /** A JD responsibility header, e.g. "Research & Discovery". */
  header: string;
  /** Real bullets that demonstrate this theme, each tagged with where/when. */
  bullets: { text: string; company: string; dates: string }[];
}

export interface CvContentOverrides {
  /** JD job title (verified) — replaces the default headline. */
  title?: string;
  /** AI-tailored professional summary — replaces the default. */
  summary?: string;
  /** Verbatim JD keywords Lenin has — rendered as a "Core Competencies" section. */
  coreCompetencies?: string[];
  /** Company values from the JD paired with real evidence — "Values Alignment" section. */
  valuesAlignment?: { value: string; evidence: string }[];
  /**
   * Experience structure override (ATS mode). At most one is used:
   * - `experienceChrono`: keep jobs (company/dates), reworded/reordered bullets.
   * - `experienceThematic`: regroup bullets under JD headers (guide-literal).
   * Absent → the default chronological experience from `data`.
   */
  experienceChrono?: ExperienceEntry[];
  experienceThematic?: ThematicGroup[];
}

function headerParagraphs(data: CvData, links: TrackedLinks, title: string): string {
  // Links line: "Portfolio: <domain>  ·  GitHub: <domain>  ·  LinkedIn: <domain>"
  // display = clean domain from data, href = tracked short URL.
  const linksLine =
    run("Portfolio: ", MUTED) +
    hyperlink("rId1", data.links.portfolio, LINK) +
    run("     ", MUTED) +
    run("GitHub: ", MUTED) +
    hyperlink("rId2", data.links.github, LINK) +
    run("     ", MUTED) +
    run("LinkedIn: ", MUTED) +
    hyperlink("rId3", data.links.linkedin, LINK);
  const contactLine =
    run(`Contact: ${data.contact.email}`, MUTED) + run(`     ${data.contact.phone}`, MUTED);

  return (
    para(run(data.name, NAME), { after: 40 }) +
    para(run(title, HEADLINE), { after: 20 }) +
    para(run(data.location, MUTED), { after: 60 }) +
    para(linksLine, { after: 30 }) +
    para(contactLine, { after: 60 })
  );
}

/** Chronological experience: one block per job (role · company, dates, context, bullets). */
function chronoExperience(entries: ExperienceEntry[]): string {
  return entries
    .map((e) => {
      const roleLine = para(
        run(e.role, ROLE) + run("  ·  ", ROLE) + run(e.company, ROLE) + `<w:r><w:tab/></w:r>` + run(e.dates, MUTED),
        { before: 120, after: 20, tabRight: true },
      );
      const context = e.context.map((c) => para(run(c, CONTEXT), { after: 20 })).join("");
      const bullets = e.bullets.map(bullet).join("");
      return roleLine + context + bullets;
    })
    .join("");
}

/** A JD-themed sub-header inside the experience section (smaller than a section header). */
function themeHeader(text: string): string {
  return para(run(text, ROLE), { before: 120, after: 20 });
}

/** Thematic experience: JD headers as sub-sections, real bullets tagged with company · dates. */
function thematicExperience(groups: ThematicGroup[]): string {
  return groups
    .map((g) => {
      const bullets = g.bullets
        .map((b) =>
          bullet(`${b.text}`).replace(
            "</w:p>",
            run(`   — ${b.company} · ${b.dates}`, MUTED) + "</w:p>",
          ),
        )
        .join("");
      return themeHeader(g.header) + bullets;
    })
    .join("");
}

function experienceSection(data: CvData, overrides: CvContentOverrides): string {
  const body = overrides.experienceThematic
    ? thematicExperience(overrides.experienceThematic)
    : chronoExperience(overrides.experienceChrono ?? data.experience);
  return sectionHeader(data.sectionTitles.experience) + body;
}

function skillsSection(data: CvData): string {
  const rows = data.skills
    .map((s) => para(run(`${s.category}: `, ROLE) + run(s.items.join(", "), BODY), { after: 40 }))
    .join("");
  return sectionHeader(data.sectionTitles.skills) + rows;
}

function certificationsSection(data: CvData): string {
  const rows = data.certifications
    .map((c) =>
      para(run(c.name, ROLE) + run(`  ·  ${c.issuer}`, MUTED) + `<w:r><w:tab/></w:r>` + run(c.date, MUTED), {
        after: 30,
        tabRight: true,
      }),
    )
    .join("");
  return sectionHeader(data.sectionTitles.certifications) + rows;
}

function educationSection(data: CvData): string {
  const rows = data.education
    .map((e) =>
      para(run(e.degree, ROLE) + run(`  ·  ${e.institution}`, MUTED) + `<w:r><w:tab/></w:r>` + run(e.dates, MUTED), {
        after: 30,
        tabRight: true,
      }),
    )
    .join("");
  return sectionHeader(data.sectionTitles.education) + rows;
}

function coreCompetenciesSection(data: CvData, keywords: string[]): string {
  // Rendered as a single comma-joined line of verbatim JD terms — the ATS
  // keyword payload, placed high (right after the summary) for early matching.
  return sectionHeader(data.sectionTitles.coreCompetencies) + para(run(keywords.join(" · "), BODY), { after: 40 });
}

function valuesAlignmentSection(data: CvData, values: { value: string; evidence: string }[]): string {
  const rows = values
    .map((v) =>
      para(run("•  ", BODY) + run(`${v.value}: `, ROLE) + run(v.evidence, BODY), {
        after: 40,
      }),
    )
    .join("");
  return sectionHeader(data.sectionTitles.valuesAlignment) + rows;
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

/** The document's own rels: the three external hyperlink targets (tracked URLs). */
function documentRels(links: TrackedLinks): string {
  const rel = (id: string, url: string) =>
    `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(url)}" TargetMode="External"/>`;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    rel("rId1", links.portfolio) +
    rel("rId2", links.github) +
    rel("rId3", links.linkedin) +
    `</Relationships>`
  );
}

/** Assemble the CV .docx. `overrides` layer JD-tailored content on top of the base data. */
export async function buildCvDocx(
  data: CvData,
  links: TrackedLinks,
  overrides: CvContentOverrides = {},
): Promise<Uint8Array> {
  const title = overrides.title?.trim() || data.title;
  const summary = overrides.summary?.trim() || data.summary;

  const body =
    headerParagraphs(data, links, title) +
    sectionHeader(data.sectionTitles.summary) +
    para(run(summary, BODY), { after: 40 }) +
    (overrides.coreCompetencies?.length ? coreCompetenciesSection(data, overrides.coreCompetencies) : "") +
    experienceSection(data, overrides) +
    skillsSection(data) +
    (overrides.valuesAlignment?.length ? valuesAlignmentSection(data, overrides.valuesAlignment) : "") +
    certificationsSection(data) +
    educationSection(data);

  const document =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>` +
    body +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>` +
    `</w:body></w:document>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("word/document.xml", document);
  zip.file("word/_rels/document.xml.rels", documentRels(links));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
