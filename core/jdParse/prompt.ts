import type { ParsedJd } from "./types";

export function buildJdParsePrompt(text: string): { system: string; user: string } {
  return {
    system:
      "You extract structured data from job descriptions. " +
      "Output a single valid JSON object — no markdown fences, no commentary. " +
      "All string values must be verbatim from the posting, never paraphrased or invented.",
    user:
      "Extract structured data from this job description and return a JSON object with these keys:\n" +
      "- jobTitle: string | null — the exact job title\n" +
      "- requiredKeywords: string[] — must-have skills, qualifications, requirements\n" +
      "- preferredKeywords: string[] — nice-to-have or \"preferred\" skills\n" +
      "- tools: string[] — specific software, tools, platforms, languages\n" +
      "- sectionHeaders: string[] — section headings used in the posting\n" +
      "- companyValues: string[] — company values, culture signals, or mission statements\n\n" +
      `Job description:\n${text}`,
  };
}

const EMPTY: ParsedJd = {
  requiredKeywords: [],
  preferredKeywords: [],
  tools: [],
  sectionHeaders: [],
  companyValues: [],
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Parse the raw AI response text into a `ParsedJd`. Returns an empty structure on failure. */
export function parseJdResponse(text: string): ParsedJd {
  try {
    const json = JSON.parse(text.trim()) as Partial<ParsedJd>;
    return {
      jobTitle: typeof json.jobTitle === "string" && json.jobTitle ? json.jobTitle : undefined,
      requiredKeywords: asStringArray(json.requiredKeywords),
      preferredKeywords: asStringArray(json.preferredKeywords),
      tools: asStringArray(json.tools),
      sectionHeaders: asStringArray(json.sectionHeaders),
      companyValues: asStringArray(json.companyValues),
    };
  } catch {
    return EMPTY;
  }
}
