import JSZip from "jszip";

/** Relationships part of the .docx where the header hyperlink URLs live. */
const RELS_PATH = "word/_rels/document.xml.rels";

/** Placeholder present in both master links (portfolio + LinkedIn). */
const PLACEHOLDER = "ref=li-cv";

/** Both header links must carry the placeholder — no more, no less. */
const EXPECTED_PLACEHOLDERS = 2;

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Fill a master .docx with the real tracking code by replacing the
 * `ref=li-cv` placeholder with `ref=<code>` in the relationships part.
 *
 * Throws if the master is missing the relationships part or does not contain
 * exactly two placeholders (signals a malformed master).
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
  const found = countOccurrences(xml, PLACEHOLDER);
  if (found !== EXPECTED_PLACEHOLDERS) {
    throw new Error(
      `Master must contain exactly ${EXPECTED_PLACEHOLDERS} "${PLACEHOLDER}" placeholders in ${RELS_PATH}, found ${found}. The master looks malformed.`,
    );
  }

  const filled = xml.split(PLACEHOLDER).join(`ref=${code}`);
  zip.file(RELS_PATH, filled);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
