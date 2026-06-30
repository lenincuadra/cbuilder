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
  who: string;
  jobUrl: string;
}

/** Concrete folders a given language choice will produce, ["EN"] | ["ES"] | ["EN","ES"]. */
export function languagesFor(choice: LanguageChoice): Array<"EN" | "ES"> {
  return choice === "Ambos" ? ["EN", "ES"] : [choice];
}
