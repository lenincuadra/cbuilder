import type { Channel } from "@/core/registry/types";
import type { LanguageChoice } from "@/core/types";

/** Sentinel select value meaning "omitir" (no channel). */
export const CHANNEL_OMIT = "__omit__";

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
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether the email requirement is satisfied (only enforced for the Email channel). */
export function emailRequirementMet(data: Pick<WizardData, "channel" | "email">): boolean {
  return data.channel !== "Email" || EMAIL_RE.test(data.email.trim());
}

/** Concrete folders a given language choice will produce, ["EN"] | ["ES"] | ["EN","ES"]. */
export function languagesFor(choice: LanguageChoice): Array<"EN" | "ES"> {
  return choice === "Ambos" ? ["EN", "ES"] : [choice];
}
