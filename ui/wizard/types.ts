import type { Channel, CvMode } from "@/core/registry/types";
import { languagesFor, type LanguageChoice } from "@/core/types";

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
  jobUrl: string;
  /**
   * Free-text requirements/highlights from the posting — extra grounding for
   * the AI pipeline beyond company/role/focus. Optional.
   */
  jobContext: string;
  /** Portfolio focus profile id (from the spec) for the tracked links. "" = sin foco. */
  focus: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether the email requirement is satisfied (only enforced for the Email channel). */
export function emailRequirementMet(data: Pick<WizardData, "channel" | "email">): boolean {
  return data.channel !== "Email" || EMAIL_RE.test(data.email.trim());
}
