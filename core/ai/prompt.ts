import type { ExperienceEntry } from "@/core/cvData/types";
import type { ParsedJd } from "@/core/jdParse/types";
import type { LinkSpec } from "@/core/spec/types";
import type { Language } from "@/core/types";

/** Shared instructions every AI draft follows, regardless of what it's drafting. */
const VOICE_PREAMBLE =
  "You draft job-application material on behalf of Lenin Cuadra, a Senior Product " +
  "Designer. Use ONLY the facts in the context below; never invent employers, " +
  "metrics, tools, or projects. First person, confident, concise: lead with " +
  "outcomes, not adjectives. This draft is a starting point Lenin edits before " +
  "sending, so prefer a strong, specific first pass over a safe, generic one. " +
  "Never use em-dashes (the — character); write with commas, colons, parentheses, " +
  "or separate sentences instead.";

/**
 * Focus-specific case studies + proof points from the portfolio spec, in the
 * target language. Returns "" if there's no focus or the spec doesn't have it —
 * callers fall back to the background brief alone.
 */
export function focusCaseContext(
  spec: LinkSpec | null,
  focus: string | undefined,
  language: Language,
): string {
  if (!spec || !focus) return "";
  const profile = spec.profiles[focus];
  if (!profile) return "";
  const lang = language === "EN" ? "en" : "es";

  const proofLines = profile.proofs.map((proof) => `- ${proof[lang]}`).join("\n");
  const caseLines = profile.order
    .map((slug) => spec.cases[slug])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .slice(0, 3)
    .map((entry) => `- ${entry.title[lang]}: ${entry.description[lang]}`)
    .join("\n");

  return (
    `## Portfolio proof points for this application's focus ("${focus}")\n\n` +
    `${proofLines}\n\n## Relevant case studies (most relevant first)\n\n${caseLines}`
  );
}

/**
 * Cap on the free-text posting context — mirrors /api/job-context's own
 * extraction cap. "Detectar" already trims to this, but a hand-pasted wall of
 * text has no client-side limit; without a server-side cap each generation's
 * input cost would scale with whatever got pasted. 4000 chars ≈ 1k tokens.
 */
const MAX_JOB_CONTEXT_LENGTH = 4000;

/**
 * Full context block: static background brief + focus-specific portfolio
 * proof + (if given) free-text posting highlights the user pasted or an
 * auto-detected JobPosting description — the only per-posting grounding
 * beyond company/role/focus.
 */
export function buildContextBlock(
  background: string,
  spec: LinkSpec | null,
  focus: string | undefined,
  language: Language,
  jobContext?: string,
): string {
  const parts = [background];
  const focusBlock = focusCaseContext(spec, focus, language);
  if (focusBlock) parts.push(focusBlock);
  const trimmedContext = jobContext?.trim().slice(0, MAX_JOB_CONTEXT_LENGTH);
  if (trimmedContext) {
    parts.push(`## Extra context about this specific posting (from the user)\n\n${trimmedContext}`);
  }
  return parts.join("\n\n");
}

export interface CoverLetterPromptInput {
  context: string;
  company: string;
  role: string;
  who?: string;
  language: Language;
  parsedJd?: ParsedJd;
}

/**
 * System + user prompt for a cover letter body following the 5-paragraph
 * formula (Hook → Technical Match → Experience Story → Why This Role → Close).
 * The letterhead is generated programmatically elsewhere — this draft is the
 * full letter body: greeting through sign-off, markdown only.
 */
export function buildCoverLetterPrompt(input: CoverLetterPromptInput): {
  system: string;
  user: string;
} {
  const { context, company, role, who, language, parsedJd } = input;
  const languageName = language === "EN" ? "English" : "Spanish";
  const greeting = who?.trim()
    ? `Address it to ${who.trim()}.`
    : `No named contact: use a generic professional greeting (not "To Whom It May Concern").`;

  let p2hint = "";
  if (parsedJd) {
    const kws = [
      ...parsedJd.requiredKeywords,
      ...parsedJd.tools,
      ...parsedJd.preferredKeywords,
    ].filter((k) => k.trim()).slice(0, 12);
    if (kws.length > 0) {
      p2hint =
        ` For paragraph 2, prioritise these exact terms from the JD (use them verbatim where they apply): ` +
        kws.join(", ") + `.`;
    }
  }

  return {
    system: `${VOICE_PREAMBLE}\n\n${context}`,
    user:
      `Write the body of a cover letter (greeting through sign-off, no letterhead) for an ` +
      `application to ${company} for the role "${role}". ${greeting} Write in ${languageName}. ` +
      `Use EXACTLY 5 paragraphs in this order:\n` +
      `1. Hook: genuine enthusiasm for THIS company specifically; mention their mission, ` +
      `a product, or a challenge they face. Not generic.\n` +
      `2. Technical Match: relevant technical skills using their exact terminology; keep it ` +
      `natural but keyword-rich ("I'm proficient in X, have strong Y skills...").${p2hint}\n` +
      `3. Experience Story: one specific, brief example of relevant work; include a number ` +
      `or outcome where possible.\n` +
      `4. Why This Role: what specifically excites Lenin about THIS role; reference the JD.\n` +
      `5. Close: availability/location if relevant, interest in discussing further; 2–3 ` +
      `sentences max.\n\n` +
      `Tone: human, use contractions (I'm, I've, don't). Never open with "I am writing to ` +
      `express my interest in". Don't repeat the CV; add context. Under 400 words. ` +
      `Never use em-dashes (the — character); use commas, colons, or parentheses instead. ` +
      `Markdown only: paragraphs, line breaks, **bold**, *italic*.`,
  };
}

export type ExperienceVariant = "chronological" | "thematic";

export interface AtsExperiencePromptInput {
  experience: ExperienceEntry[];
  parsedJd: ParsedJd;
  variant: ExperienceVariant;
  language: Language;
}

/** Serialize the real experience for the prompt (job header + bullets). */
function serializeExperience(experience: ExperienceEntry[]): string {
  return experience
    .map((e) => {
      const bullets = e.bullets.map((b) => `  - ${b}`).join("\n");
      return `Job: ${e.role} · ${e.company} (${e.dates})\n${bullets}`;
    })
    .join("\n\n");
}

/**
 * System + user prompt to restructure Lenin's REAL experience for a JD (ATS mode).
 * Two variants:
 * - "chronological": keep jobs (role/company/dates/context), reword bullets to
 *   weave in the JD's verbatim terms WHERE TRUTHFUL, reorder most-relevant first.
 * - "thematic": regroup the real bullets under 3–4 JD-aligned theme headers,
 *   tagging each with its company + year.
 *
 * Grounding is strict: only reword/regroup existing bullets, never invent facts,
 * metrics, tools, or skills. Every line is human-verified in the gate afterward.
 */
export function buildAtsExperiencePrompt(input: AtsExperiencePromptInput): {
  system: string;
  user: string;
} {
  const { experience, parsedJd, variant, language } = input;
  const langName = language === "EN" ? "English" : "Spanish";
  const keywords = [...parsedJd.requiredKeywords, ...parsedJd.tools, ...parsedJd.preferredKeywords]
    .filter((k) => k.trim())
    .join(", ");

  const system =
    "You restructure Lenin Cuadra's REAL CV experience for a specific job. " +
    "STRICT RULE: use ONLY the facts in the bullets given; never invent employers, " +
    "roles, dates, metrics, tools, or skills. You MAY reword a bullet to incorporate the " +
    "job's exact terminology, but ONLY where that term genuinely applies to what the bullet " +
    "already says. If a JD term doesn't truthfully fit any bullet, leave it out. Keep every " +
    "metric and proper noun intact. Never use em-dashes (the — character) in any text; use " +
    "commas or colons instead. Output valid JSON only: no markdown, no commentary.";

  const jobsBlock = serializeExperience(experience);

  if (variant === "thematic") {
    return {
      system,
      user:
        `Lenin's real experience:\n\n${jobsBlock}\n\n` +
        `The job's key terms: ${keywords}.\n\n` +
        `Regroup his real bullets under 3–4 theme headers aligned to this job's main ` +
        `responsibility areas (derive the headers from the job, e.g. "Research & Usability ` +
        `Testing", "Design Systems"). Each bullet keeps its source company and year. Reword ` +
        `bullets to include the job's terms where truthful. Write headers and bullets in ` +
        `${langName}. Return ONLY a JSON array: ` +
        `[{"header":"...","bullets":[{"text":"...","company":"...","dates":"..."}]}].`,
    };
  }

  return {
    system,
    user:
      `Lenin's real experience:\n\n${jobsBlock}\n\n` +
      `The job's key terms: ${keywords}.\n\n` +
      `Keep every job (role, company, dates). For each job, reword its bullets to naturally ` +
      `include the job's terms where truthful, and reorder them so the most relevant to this ` +
      `job come first. Do not drop jobs or invent bullets. Write in ${langName}. Return ONLY a ` +
      `JSON array: [{"role":"...","company":"...","dates":"...","context":["..."],"bullets":["..."]}].`,
  };
}

export interface ValuesAlignmentPromptInput {
  context: string;
  values: string[];
  language: Language;
}

/**
 * System + user prompt for the ATS "Values Alignment" section: for each company
 * value from the JD, draft a short evidence line pairing it with something real
 * Lenin did (grounded in the context — never invents). Output is a JSON array
 * of { value, evidence } so evidence maps back to each value; Lenin edits/approves
 * every line in the gate before anything is injected.
 */
export function buildValuesAlignmentPrompt(input: ValuesAlignmentPromptInput): {
  system: string;
  user: string;
} {
  const { context, values, language } = input;
  const langName = language === "EN" ? "English" : "Spanish";
  return {
    system: `${VOICE_PREAMBLE}\n\n${context}`,
    user:
      `A company lists these values: ${values.map((v) => `"${v}"`).join(", ")}. ` +
      `For each value, write ONE short sentence (≤ 20 words, ${langName}) pairing it with a ` +
      `real, specific thing from Lenin's background above, such as a project, outcome, or way of ` +
      `working. Never invent; if nothing in the context genuinely fits a value, return an ` +
      `empty string for its evidence (Lenin will fill it). Return ONLY a JSON array like ` +
      `[{"value":"<the value>","evidence":"<sentence>"}], no markdown, no commentary.`,
  };
}

export interface ScreeningAnswerPromptInput {
  context: string;
  question: string;
  company?: string;
  role?: string;
}

export interface CvSummaryPromptInput {
  context: string;
  company: string;
  role: string;
  language: Language;
  parsedJd?: ParsedJd;
}

/**
 * System + user prompt for an AI-tailored professional summary paragraph. Output
 * is plain text (no markdown) — it slots directly into the .docx paragraph.
 * The AI rewrites Lenin's real experience in the JD's language; never invents.
 */
export function buildCvSummaryPrompt(input: CvSummaryPromptInput): {
  system: string;
  user: string;
} {
  const { context, company, role, language, parsedJd } = input;
  const langName = language === "EN" ? "English" : "Spanish";

  let jdExtra = "";
  if (parsedJd) {
    if (parsedJd.jobTitle) {
      jdExtra += `\n\n## Target role title\n${parsedJd.jobTitle}`;
    }
    const keywords = [
      ...parsedJd.requiredKeywords,
      ...parsedJd.tools,
      ...parsedJd.preferredKeywords,
    ].filter((k) => k.trim());
    if (keywords.length > 0) {
      jdExtra +=
        "\n\n## JD keywords and tools (weave in where truthfully applicable)\n" +
        keywords.map((k) => `- ${k}`).join("\n");
    }
  }

  return {
    system: `${VOICE_PREAMBLE}\n\n${context}${jdExtra}`,
    user:
      `Write the professional summary paragraph for Lenin Cuadra's CV for his application ` +
      `to ${company} as "${role}". Write in ${langName}. Plain text only: no markdown, ` +
      `no bullet points, no headers, no labels. 2–3 sentences. First person. Lead with ` +
      `the most relevant proof point or credential from the context, naturally incorporate ` +
      `any JD keywords that truthfully apply, close with the distinctive value he brings ` +
      `to this specific role. Never invent skills, projects, or metrics.`,
  };
}

/** System + user prompt for a suggested pre-screening answer. */
export function buildScreeningAnswerPrompt(input: ScreeningAnswerPromptInput): {
  system: string;
  user: string;
} {
  const { context, question, company, role } = input;
  const applicationLine =
    company || role
      ? `This was asked by ${[company, role].filter(Boolean).join(", ")}.`
      : "";

  return {
    system: `${VOICE_PREAMBLE}\n\n${context}`,
    user:
      `Draft an answer to this pre-screening question: "${question}" ${applicationLine} ` +
      `Answer in the same language as the question. Plain text, no markdown, no greeting: ` +
      `just the answer, as if typed directly into an application form. Keep it as short as the ` +
      `question warrants (a few sentences unless it clearly asks for more).`,
  };
}
