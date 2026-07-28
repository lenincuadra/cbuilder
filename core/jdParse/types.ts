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
