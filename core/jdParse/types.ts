/**
 * Verbatim claims from the JD that Lenin has verified as truthful (Modo 3 gate).
 * Only verified items are injected into the CV slots. Faithful record of what
 * Lenin confirmed before generation — persisted on the registry row.
 */
export interface VerifiedClaims {
  /** The JD's job title was confirmed as an accurate match for Lenin's actual role. */
  titleVerified: boolean;
  /** Verified required keywords (verbatim strings from ParsedJd.requiredKeywords). */
  requiredKeywords: string[];
  /** Verified tools (verbatim strings from ParsedJd.tools). */
  tools: string[];
  /** Verified preferred keywords. */
  preferredKeywords: string[];
}

/** Structured representation of a job description, extracted by AI. */
export interface ParsedJd {
  /** Job title as stated in the posting (verbatim). */
  jobTitle?: string;
  /** Must-have skills, qualifications, or requirements (verbatim from the posting). */
  requiredKeywords: string[];
  /** Nice-to-have or "preferred" skills (verbatim). */
  preferredKeywords: string[];
  /** Specific software, tools, platforms, or languages mentioned. */
  tools: string[];
  /** Section headings used in the posting (e.g. "What you'll do", "Requirements"). */
  sectionHeaders: string[];
  /** Company values, culture signals, or mission statements. */
  companyValues: string[];
}
