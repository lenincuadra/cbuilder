import JSZip from "jszip";
import { LINK_ID } from "./links";

/** Relationships part of the .docx where the header hyperlink URLs live. */
const RELS_PATH = "word/_rels/document.xml.rels";

/** Placeholder present in both master links (portfolio + LinkedIn). */
const PLACEHOLDER = "ref=li-cv";

/** The LinkedIn link is the one carrying &dest=linkedin (XML-escaped in the rels). */
const LINKEDIN_PLACEHOLDER = "ref=li-cv&amp;dest=linkedin";

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Fill a master .docx with the real tracking code, appending a per-link
 * identifier so clicks can be told apart:
 *   - portfolio link  -> ref=<code>P
 *   - LinkedIn link    -> ref=<code>L
 *
 * Throws if the master is missing the relationships part, or does not contain
 * exactly two `ref=li-cv` placeholders with exactly one being the LinkedIn link
 * (signals a malformed master).
 *
 * Returns the bytes of the filled .docx.
 */
export async function fillMaster(
  masterBytes: Uint8Array | ArrayBuffer,
  code: string,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(masterBytes);
  const relsFile = zip.file(RELS_PATH);
  if (!relsFile) {
    throw new Error(`Master is missing ${RELS_PATH}; cannot insert the tracking code.`);
  }

  const xml = await relsFile.async("string");
  const total = countOccurrences(xml, PLACEHOLDER);
  const linkedin = countOccurrences(xml, LINKEDIN_PLACEHOLDER);
  if (total !== 2 || linkedin !== 1) {
    throw new Error(
      `Master must contain exactly 2 "${PLACEHOLDER}" placeholders (1 LinkedIn, 1 portfolio) in ${RELS_PATH}; found ${total} total, ${linkedin} LinkedIn. The master looks malformed.`,
    );
  }

  // Replace the LinkedIn link first (more specific), then the remaining portfolio one.
  const filled = xml
    .split(LINKEDIN_PLACEHOLDER)
    .join(`ref=${code}${LINK_ID.linkedin}&amp;dest=linkedin`)
    .split(PLACEHOLDER)
    .join(`ref=${code}${LINK_ID.portfolio}`);

  zip.file(RELS_PATH, filled);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
