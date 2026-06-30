import type { Language } from "./types";

// Combining diacritical marks range, stripped after NFKD normalization.
const DIACRITICS = /[̀-ͯ]/g;

/**
 * Slugify a company name for the delivery folder:
 * lowercase, strip diacritics, keep only [a-z0-9] (drop spaces/punctuation).
 * e.g. "GlobalLogic" -> "globallogic", "Mercado Libre" -> "mercadolibre".
 */
export function slugifyCompany(company: string): string {
  return company
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export interface FolderNameInput {
  language: Language;
  company: string;
  code: string;
}

/** Build the delivery folder name: `[LANG]_[company]_[code]`, e.g. "EN_globallogic_0628r4". */
export function folderName({ language, company, code }: FolderNameInput): string {
  return `${language}_${slugifyCompany(company)}_${code}`;
}
