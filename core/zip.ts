import JSZip from "jszip";
import { COVER_LETTER_FILENAME } from "./coverLetter/docx";
import type { Language } from "./types";

/** The delivered file name is always generic — no tracking data in it. */
export const CV_FILENAME = "Lenin_Cuadra_CV.docx";

export interface CvEntry {
  /** Folder name, e.g. "EN_globallogic_0628r4". */
  folder: string;
  /** Concrete language of this entry (used by extra sinks, e.g. Google Docs). */
  language: Language;
  /** Filled .docx bytes for this folder. */
  docx: Uint8Array;
  /** Cover letter .docx bytes for this folder, when the application carries one. */
  coverLetter?: Uint8Array;
}

/**
 * Package one or more filled CVs into a single delivery .zip.
 * Structure: `<folder>/Lenin_Cuadra_CV.docx` per entry, plus
 * `<folder>/Lenin_Cuadra_Cover_Letter.docx` when the entry has a letter.
 * The "Ambos" case passes two entries (EN + ES) -> one zip, two folders.
 */
export async function packageCvs(entries: CvEntry[]): Promise<Uint8Array> {
  if (entries.length === 0) {
    throw new Error("No CV entries to package.");
  }
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(`${entry.folder}/${CV_FILENAME}`, entry.docx);
    if (entry.coverLetter) {
      zip.file(`${entry.folder}/${COVER_LETTER_FILENAME}`, entry.coverLetter);
    }
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
