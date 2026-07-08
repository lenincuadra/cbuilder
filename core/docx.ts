import JSZip from "jszip";
import { LINK_ID, type FocusProfileId } from "./links";

/** Relationships part of the .docx where the header hyperlink URLs live. */
const RELS_PATH = "word/_rels/document.xml.rels";

/** Placeholder present in all three master links (portfolio + LinkedIn + GitHub). */
const PLACEHOLDER = "ref=li-cv";

/** The LinkedIn link is the one carrying &dest=linkedin (XML-escaped in the rels). */
const LINKEDIN_PLACEHOLDER = "ref=li-cv&amp;dest=linkedin";

/** The GitHub link is the one carrying &dest=github (XML-escaped in the rels). */
const GITHUB_PLACEHOLDER = "ref=li-cv&amp;dest=github";

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Fill a master .docx with the real tracking code, appending a per-link
 * identifier so clicks can be told apart:
 *   - portfolio link  -> ref=<code>P
 *   - LinkedIn link    -> ref=<code>L
 *   - GitHub link      -> ref=<code>G
 *
 * An optional focus profile is appended to all links (`&focus=<id>`) so the
 * portfolio personalizes its case order for that application's visitors.
 *
 * Throws if the master is missing the relationships part, or does not contain
 * exactly three `ref=li-cv` placeholders with exactly one LinkedIn and one
 * GitHub link (signals a malformed master).
 *
 * Returns the bytes of the filled .docx.
 */
export async function fillMaster(
  masterBytes: Uint8Array | ArrayBuffer,
  code: string,
  focus?: FocusProfileId,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(masterBytes);
  const relsFile = zip.file(RELS_PATH);
  if (!relsFile) {
    throw new Error(`Master is missing ${RELS_PATH}; cannot insert the tracking code.`);
  }

  const xml = await relsFile.async("string");
  const total = countOccurrences(xml, PLACEHOLDER);
  const linkedin = countOccurrences(xml, LINKEDIN_PLACEHOLDER);
  const github = countOccurrences(xml, GITHUB_PLACEHOLDER);
  if (total !== 3 || linkedin !== 1 || github !== 1) {
    throw new Error(
      `Master must contain exactly 3 "${PLACEHOLDER}" placeholders (1 portfolio, 1 LinkedIn, 1 GitHub) in ${RELS_PATH}; found ${total} total, ${linkedin} LinkedIn, ${github} GitHub. The master looks malformed.`,
    );
  }

  // Replace the dest-specific links first (more specific), then the remaining portfolio one.
  const focusParam = focus ? `&amp;focus=${focus}` : "";
  const filled = xml
    .split(LINKEDIN_PLACEHOLDER)
    .join(`ref=${code}${LINK_ID.linkedin}&amp;dest=linkedin${focusParam}`)
    .split(GITHUB_PLACEHOLDER)
    .join(`ref=${code}${LINK_ID.github}&amp;dest=github${focusParam}`)
    .split(PLACEHOLDER)
    .join(`ref=${code}${LINK_ID.portfolio}${focusParam}`);

  zip.file(RELS_PATH, filled);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
