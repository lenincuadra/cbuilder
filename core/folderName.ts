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
  /**
   * Optional mode subfolder for an additional CV variant of the same
   * application (e.g. "ats"), so multiple modes for one code don't collide:
   * `EN_globallogic_0628r4/ats`. Absent for the first CV.
   */
  variant?: string;
}

/** Build the delivery folder name: `[LANG]_[company]_[code]` (+ `/[variant]` for extra CVs). */
export function folderName({ language, company, code, variant }: FolderNameInput): string {
  const base = `${language}_${slugifyCompany(company)}_${code}`;
  return variant ? `${base}/${variant}` : base;
}
