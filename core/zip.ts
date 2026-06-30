import JSZip from "jszip";

/** The delivered file name is always generic — no tracking data in it. */
export const CV_FILENAME = "Lenin_Cuadra_CV.docx";

export interface CvEntry {
  /** Folder name, e.g. "EN_globallogic_0628r4". */
  folder: string;
  /** Filled .docx bytes for this folder. */
  docx: Uint8Array;
}

/**
 * Package one or more filled CVs into a single delivery .zip.
 * Structure: `<folder>/Lenin_Cuadra_CV.docx` per entry.
 * The "Ambos" case passes two entries (EN + ES) -> one zip, two folders.
 */
export async function packageCvs(entries: CvEntry[]): Promise<Uint8Array> {
  if (entries.length === 0) {
    throw new Error("No CV entries to package.");
  }
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(`${entry.folder}/${CV_FILENAME}`, entry.docx);
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
