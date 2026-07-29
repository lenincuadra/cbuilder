import type { ParsedJd } from "../jdParse/types";
import type { CvContentOverrides } from "./docx";
import type { CvData } from "./types";

/** One candidate keyword for the Core Competencies gate. */
export interface CompetencyCandidate {
  /** Verbatim JD term. */
  keyword: string;
  source: "required" | "tool" | "preferred";
  /**
   * True when the term already appears in Lenin's skills inventory (case-
   * insensitive substring match) — the gate pre-checks these, since he
   * demonstrably has them. He can still uncheck, and check unmatched ones he
   * truthfully has.
   */
  alreadyListed: boolean;
}

/** All skill items and category names, lowercased, for matching. */
function skillHaystack(data: CvData): string {
  return data.skills
    .flatMap((s) => [s.category, ...s.items])
    .join(" | ")
    .toLowerCase();
}

/**
 * Every JD keyword (required + tools + preferred), de-duplicated, tagged with
 * whether Lenin already lists it. Order: required, then tools, then preferred
 * — the order they should appear in the Core Competencies section.
 */
export function suggestCompetencies(parsedJd: ParsedJd, data: CvData): CompetencyCandidate[] {
  const haystack = skillHaystack(data);
  const seen = new Set<string>();
  const out: CompetencyCandidate[] = [];
  const push = (keyword: string, source: CompetencyCandidate["source"]) => {
    const key = keyword.trim().toLowerCase();
    if (key === "" || seen.has(key)) return;
    seen.add(key);
    out.push({ keyword: keyword.trim(), source, alreadyListed: haystack.includes(key) });
  };
  parsedJd.requiredKeywords.forEach((k) => push(k, "required"));
  parsedJd.tools.forEach((k) => push(k, "tool"));
  parsedJd.preferredKeywords.forEach((k) => push(k, "preferred"));
  return out;
}

/** A company value from the JD paired with the evidence Lenin confirmed. */
export interface ValueAlignment {
  value: string;
  evidence: string;
}

/**
 * Human-verified selections from the ATS gate. Only what Lenin confirmed:
 * checked competencies (verbatim), value alignments he wrote/approved, an
 * edited summary, and whether the JD title is truthful.
 */
export interface AtsSelections {
  titleVerified: boolean;
  /** Verbatim JD keywords Lenin confirmed he has. */
  competencies: string[];
  /** Company-value alignments with non-empty evidence. */
  values: ValueAlignment[];
  /** AI-tailored professional summary (edited). Empty → keep the master summary. */
  summary?: string;
}

/** The initial (empty) gate state — competencies pre-selected to the ones Lenin already lists. */
export function initialAtsSelections(parsedJd: ParsedJd, data: CvData): AtsSelections {
  return {
    titleVerified: false,
    competencies: suggestCompetencies(parsedJd, data)
      .filter((c) => c.alreadyListed)
      .map((c) => c.keyword),
    values: parsedJd.companyValues.map((value) => ({ value, evidence: "" })),
    summary: "",
  };
}

/**
 * Turn the verified gate selections into the CV content overrides consumed by
 * `buildCvDocx`. Nothing is injected that Lenin didn't confirm: an unverified
 * title, empty competencies, and value rows without evidence are all dropped.
 */
export function buildAtsOverrides(
  parsedJd: ParsedJd,
  selections: AtsSelections,
): CvContentOverrides {
  const overrides: CvContentOverrides = {};

  if (selections.titleVerified && parsedJd.jobTitle) {
    overrides.title = parsedJd.jobTitle;
  }
  const summary = selections.summary?.trim();
  if (summary) {
    overrides.summary = summary;
  }
  const competencies = selections.competencies.map((c) => c.trim()).filter(Boolean);
  if (competencies.length > 0) {
    overrides.coreCompetencies = competencies;
  }
  const values = selections.values.filter((v) => v.evidence.trim() !== "");
  if (values.length > 0) {
    overrides.valuesAlignment = values.map((v) => ({ value: v.value, evidence: v.evidence.trim() }));
  }

  return overrides;
}
