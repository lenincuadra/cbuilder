import { COVER_LETTER_AI, COVER_LETTER_NONE, type CoverLetterBodies } from "@/core/coverLetter/types";
import type { Channel } from "@/core/registry/types";
import { languagesFor, type LanguageChoice } from "@/core/types";

export { languagesFor, COVER_LETTER_AI, COVER_LETTER_NONE };

/** Sentinel select value meaning "omitir" (no channel). */
export const CHANNEL_OMIT = "__omit__";

/** Sentinel select value meaning "sin foco" (default portfolio order). */
export const FOCUS_NONE = "__none__";

/** Mutable wizard state. Notes and status are not set here — they live in the table. */
export interface WizardData {
  company: string;
  language: LanguageChoice;
  date: Date;
  role: string;
  /** "" = omitir. */
  channel: Channel | "";
  /** Email applied to — required when channel is "Email". */
  email: string;
  who: string;
  jobUrl: string;
  /**
   * Free-text requirements/highlights from the posting — extra grounding for
   * the AI pipeline beyond company/role/focus. Optional.
   */
  jobContext: string;
  /** Portfolio focus profile id (from the spec) for the tracked links. "" = sin foco. */
  focus: string;
  /** Selected cover letter template id. "" = sin cover letter. */
  coverLetterTemplateId: string;
  /** Per-language letter bodies: template resolved with the wizard fields, then hand-editable. */
  coverLetterBodies: CoverLetterBodies;
  /** True once the user touched a body — stops re-resolving over their edits. */
  coverLetterEdited: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether the email requirement is satisfied (only enforced for the Email channel). */
export function emailRequirementMet(data: Pick<WizardData, "channel" | "email">): boolean {
  return data.channel !== "Email" || EMAIL_RE.test(data.email.trim());
}
