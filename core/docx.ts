import JSZip from "jszip";
import type { TrackedLinks } from "./spec/links";

/** Relationships part of the .docx where the header hyperlink URLs live. */
const RELS_PATH = "word/_rels/document.xml.rels";

/** Marker present in all three master link targets (portfolio + LinkedIn + GitHub). */
const PLACEHOLDER = "ref=li-cv";

/** XML-escape a URL for a `Target="…"` attribute (short links rarely need it, but be safe). */
function xmlEscape(url: string): string {
  return url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Fill a master .docx with the real tracked links. The master keeps three
 * hyperlink targets marked with `ref=li-cv` (one plain = portfolio, one with
 * `dest=linkedin`, one with `dest=github`); each is replaced **whole** with the
 * corresponding link from the spec (short-link form), so the master file itself
 * never has to change when the URL format does.
 *
 * Throws if the relationships part is missing, or if there aren't exactly three
 * markers with one LinkedIn and one GitHub (a malformed master).
 */
export async function fillMaster(
  masterBytes: Uint8Array | ArrayBuffer,
  links: TrackedLinks,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(masterBytes);
  const relsFile = zip.file(RELS_PATH);
  if (!relsFile) {
    throw new Error(`Master is missing ${RELS_PATH}; cannot insert the tracked links.`);
  }

  const xml = await relsFile.async("string");
  const matches = [...xml.matchAll(/Target="([^"]*ref=li-cv[^"]*)"/g)];
  if (matches.length !== 3) {
    throw new Error(
      `Master must contain exactly 3 "${PLACEHOLDER}" hyperlink targets in ${RELS_PATH}; found ${matches.length}. The master looks malformed.`,
    );
  }

  let filled = xml;
  let linkedin = 0;
  let github = 0;
  for (const match of matches) {
    const [whole, value] = match;
    let url: string;
    if (value.includes("dest=linkedin")) {
      url = links.linkedin;
      linkedin += 1;
    } else if (value.includes("dest=github")) {
      url = links.github;
      github += 1;
    } else {
      url = links.portfolio;
    }
    filled = filled.replace(whole, `Target="${xmlEscape(url)}"`);
  }
  if (linkedin !== 1 || github !== 1) {
    throw new Error(
      `Master malformed: expected 1 LinkedIn and 1 GitHub target, found ${linkedin} / ${github}.`,
    );
  }

  zip.file(RELS_PATH, filled);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
