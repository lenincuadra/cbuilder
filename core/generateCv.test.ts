import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { generateCv } from "./generateCv";
import { CODE_DIGITS, CODE_LETTERS } from "./tracking";
import type { Language } from "./types";

function masterLoader(): (language: Language) => Promise<Uint8Array> {
  return async (language) =>
    new Uint8Array(
      readFileSync(join(process.cwd(), "public", "masters", `${language}.docx`)),
    );
}

// Always index 0 -> code suffix "a2".
const fixedRng = () => 0;
const fixedNow = () => new Date("2026-06-28T12:00:00.000Z");

function codeRng(pairs: Array<[number, number]>): () => number {
  const seq = pairs.flatMap(([letter, digit]) => [
    (letter + 0.5) / CODE_LETTERS.length,
    (digit + 0.5) / CODE_DIGITS.length,
  ]);
  let i = 0;
  return () => seq[Math.min(i++, seq.length - 1)];
}

describe("generateCv", () => {
  it("generates a single-language CV: one folder, one row, defaults applied", async () => {
    const result = await generateCv(
      { company: "GlobalLogic", languageChoice: "EN", date: new Date(2026, 5, 28) },
      { existingCodes: [], loadMaster: masterLoader(), rng: fixedRng, now: fixedNow },
    );

    expect(result.code).toBe("0628a2");
    expect(result.folderNames).toEqual(["EN_globallogic_0628a2"]);
    expect(result.row.role).toBe("UX/UI Designer");
    expect(result.row.status).toBe("Activo");
    expect(result.row.date).toBe("2026-06-28");

    const zip = await JSZip.loadAsync(result.zip);
    expect(zip.file("EN_globallogic_0628a2/Lenin_Cuadra_CV.docx")).not.toBeNull();
  });

  it("generates 'Ambos': two folders, one code, one row, one zip", async () => {
    const result = await generateCv(
      {
        company: "GlobalLogic",
        languageChoice: "Ambos",
        date: new Date(2026, 5, 28),
        role: "Product Designer",
        channel: "LinkedIn",
      },
      { existingCodes: [], loadMaster: masterLoader(), rng: fixedRng, now: fixedNow },
    );

    expect(result.code).toBe("0628a2");
    expect(result.folderNames).toEqual([
      "EN_globallogic_0628a2",
      "ES_globallogic_0628a2",
    ]);
    expect(result.row.role).toBe("Product Designer");
    expect(result.row.channel).toBe("LinkedIn");
    expect(result.row.language).toBe("Ambos");

    const zip = await JSZip.loadAsync(result.zip);
    expect(zip.file("EN_globallogic_0628a2/Lenin_Cuadra_CV.docx")).not.toBeNull();
    expect(zip.file("ES_globallogic_0628a2/Lenin_Cuadra_CV.docx")).not.toBeNull();
  });

  it("avoids a code already present in the registry", async () => {
    const result = await generateCv(
      { company: "Acme", languageChoice: "EN", date: new Date(2026, 5, 28) },
      {
        existingCodes: ["0628a2"],
        loadMaster: masterLoader(),
        rng: codeRng([
          [0, 0],
          [1, 1],
        ]),
        now: fixedNow,
      },
    );
    expect(result.code).toBe("0628b3");
  });

  it("uses a precomputed code verbatim (preview path)", async () => {
    const result = await generateCv(
      { company: "GlobalLogic", languageChoice: "EN", date: new Date(2026, 5, 28), code: "0628z9" },
      { existingCodes: [], loadMaster: masterLoader(), now: fixedNow },
    );
    expect(result.code).toBe("0628z9");
    expect(result.folderNames).toEqual(["EN_globallogic_0628z9"]);
  });
});
