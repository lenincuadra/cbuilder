import JSZip from "jszip";
import { folderName } from "../folderName";
import type { Language, LanguageChoice } from "../types";
import { buildCoverLetterDocx, COVER_LETTER_FILENAME } from "./docx";
import type { CoverLetterBodies } from "./types";

export interface CoverLetterEntry {
  /** Folder name, matching the CV's own — e.g. "EN_globallogic_0628r4". */
  folder: string;
  language: Language;
  /** Filled cover-letter .docx bytes. */
  bytes: Uint8Array;
}

/**
 * Build one cover-letter .docx per language that has a body, for an
 * application whose CV already shipped. Reconstructs the exact same
 * folder(s) the CV was archived under — `folderName` depends only on
 * `language`/`company`/`code`, all already on the row.
 */
export async function buildCoverLetterEntries(
  application: { code: string; company: string; language: LanguageChoice },
  bodies: CoverLetterBodies,
  date: Date,
): Promise<CoverLetterEntry[]> {
  const languages: Language[] = application.language === "Ambos" ? ["EN", "ES"] : [application.language];
  const entries: CoverLetterEntry[] = [];
  for (const language of languages) {
    const bodyMarkdown = bodies[language]?.trim();
    if (!bodyMarkdown) continue;
    const bytes = await buildCoverLetterDocx({ language, bodyMarkdown, date });
    entries.push({ folder: folderName({ language, company: application.company, code: application.code }), language, bytes });
  }
  return entries;
}

/**
 * Package cover-letter-only entries into a single .zip for download —
 * `<folder>/Lenin_Cuadra_Cover_Letter.docx` per entry, mirroring the CV zip's
 * structure (`core/zip.ts` → `packageCvs`) but without a CV alongside.
 */
export async function packageCoverLetters(entries: CoverLetterEntry[]): Promise<Uint8Array> {
  if (entries.length === 0) {
    throw new Error("No cover letter entries to package.");
  }
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(`${entry.folder}/${COVER_LETTER_FILENAME}`, entry.bytes);
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
