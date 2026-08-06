import type { CvMode } from "@/core/registry/types";
import type { AtsSelections } from "@/core/cvData/tailor";
import type { ParsedJd, VerifiedClaims } from "@/core/jdParse/types";
import type { Channel, ReachType } from "@/core/registry/types";
import { languagesFor, type Language, type LanguageChoice } from "@/core/types";

export { languagesFor };

/** Sentinel select value meaning "omitir" (no channel). */
export const CHANNEL_OMIT = "__omit__";

/** Sentinel select value meaning "sin foco" (default portfolio order). */
export const FOCUS_NONE = "__none__";

/** Mutable wizard state. Notes and status are not set here — they live in the table. */
export interface WizardData {
  /** How the CV body is built — chosen in the first step (see `CvMode`). */
  mode: CvMode;
  company: string;
  language: LanguageChoice;
  date: Date;
  role: string;
  /** "" = omitir. */
  channel: Channel | "";
  /** Email applied to — required when channel is "Email". */
  email: string;
  who: string;
  /** How the process started — defaults to "outbound" (the common case). */
  reach: ReachType;
  jobUrl: string;
  /**
   * Free-text requirements/highlights from the posting — extra grounding for
   * the AI pipeline beyond company/role/focus. Optional.
   */
  jobContext: string;
  /**
   * Structured parse of the job description — AI-extracted from `jobContext`
   * when the user clicks "Detectar" (URL) or "Analizar" (manual paste). Null
   * until parsed; persisted on the row for use by modes 2 and 3.
   */
  parsedJd: ParsedJd | null;
  /**
   * AI-drafted professional summary per language (Modo 2 — Asistido). Null
   * until the StepAssisted step is visited; populated on first generation,
   * then editable before confirming. Not persisted on the row (ephemeral draft).
   */
  assistedSummaries: Partial<Record<Language, string>> | null;
  /**
   * Verbatim claims verified in the Modo 3 gate (StepVerify). Null until the
   * gate step is visited; each toggle updates this live. Persisted on the row.
   */
  verifiedClaims: VerifiedClaims | null;
  /**
   * ATS-mode gate selections (StepAts): verified title, checked Core
   * Competencies, Values Alignment evidence, and the tailored summary. Null
   * until the gate step is visited; becomes the CV overrides at generation.
   */
  atsSelections: AtsSelections | null;
  /** Portfolio focus profile id (from the spec) for the tracked links. "" = sin foco. */
  focus: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether the email requirement is satisfied (only enforced for the Email channel). */
export function emailRequirementMet(data: Pick<WizardData, "channel" | "email">): boolean {
  return data.channel !== "Email" || EMAIL_RE.test(data.email.trim());
}
