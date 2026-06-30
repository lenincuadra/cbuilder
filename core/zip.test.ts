import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { CV_FILENAME, packageCvs } from "./zip";

const enc = new TextEncoder();

async function listFiles(zipBytes: Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(zipBytes);
  return Object.keys(zip.files);
}

describe("packageCvs", () => {
  it("packages a single language into one folder", async () => {
    const bytes = await packageCvs([
      { folder: "EN_globallogic_0628r4", docx: enc.encode("EN") },
    ]);
    expect(await listFiles(bytes)).toContain(`EN_globallogic_0628r4/${CV_FILENAME}`);
  });

  it("packages 'Ambos' as one zip with two folders", async () => {
    const bytes = await packageCvs([
      { folder: "EN_globallogic_0628r4", docx: enc.encode("EN") },
      { folder: "ES_globallogic_0628r4", docx: enc.encode("ES") },
    ]);
    const files = await listFiles(bytes);
    expect(files).toContain(`EN_globallogic_0628r4/${CV_FILENAME}`);
    expect(files).toContain(`ES_globallogic_0628r4/${CV_FILENAME}`);
  });

  it("throws on empty input", async () => {
    await expect(packageCvs([])).rejects.toThrow(/No CV entries/);
  });
});
