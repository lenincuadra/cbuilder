import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { generateCv } from "./generateCv";
import { CODE_DIGITS, CODE_LETTERS } from "./spec/code";
import { TEST_SPEC } from "./spec/testSpec";
import type { Language } from "./types";

function masterLoader(): (language: Language) => Promise<Uint8Array> {
  return async (language) =>
    new Uint8Array(
      readFileSync(join(process.cwd(), "public", "masters", `${language}.docx`)),
    );
}

/** Deps with the test spec; callers add existingCodes / rng / now. */
function deps(extra: Partial<Parameters<typeof generateCv>[1]> = {}) {
  return { spec: TEST_SPEC, existingCodes: [], loadMaster: masterLoader(), ...extra };
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
      deps({ rng: fixedRng, now: fixedNow }),
    );

    expect(result.code).toBe("0628a2");
    expect(result.folderNames).toEqual(["EN_globallogic_0628a2"]);
    // Entries expose the per-language docx for extra sinks (Google Docs).
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].folder).toBe("EN_globallogic_0628a2");
    expect(result.entries[0].language).toBe("EN");
    expect(result.entries[0].docx.length).toBeGreaterThan(0);
    // Delivery zip name, also persisted on the row (data/cvs archive record).
    expect(result.zipName).toBe("EN_globallogic_0628a2.zip");
    expect(result.row.zipName).toBe("EN_globallogic_0628a2.zip");
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
      deps({ rng: fixedRng, now: fixedNow }),
    );

    expect(result.code).toBe("0628a2");
    expect(result.folderNames).toEqual([
      "EN_globallogic_0628a2",
      "ES_globallogic_0628a2",
    ]);
    expect(result.row.role).toBe("Product Designer");
    expect(result.row.channel).toBe("LinkedIn");
    expect(result.row.language).toBe("Ambos");
    // "Ambos" zip name carries the slug + code (two folders inside).
    expect(result.zipName).toBe("globallogic_0628a2.zip");

    const zip = await JSZip.loadAsync(result.zip);
    expect(zip.file("EN_globallogic_0628a2/Lenin_Cuadra_CV.docx")).not.toBeNull();
    expect(zip.file("ES_globallogic_0628a2/Lenin_Cuadra_CV.docx")).not.toBeNull();
  });

  it("avoids a code already present in the registry", async () => {
    const result = await generateCv(
      { company: "Acme", languageChoice: "EN", date: new Date(2026, 5, 28) },
      deps({
        existingCodes: ["0628a2"],
        rng: codeRng([
          [0, 0],
          [1, 1],
        ]),
        now: fixedNow,
      }),
    );
    expect(result.code).toBe("0628b3");
  });

  it("persists the focus profile and bakes it into the CV links", async () => {
    const result = await generateCv(
      { company: "Acme", languageChoice: "EN", date: new Date(2026, 5, 28), focus: "payments" },
      deps({ rng: fixedRng, now: fixedNow }),
    );

    expect(result.row.focus).toBe("payments");

    const zip = await JSZip.loadAsync(result.zip);
    const docx = await zip.file("EN_acme_0628a2/Lenin_Cuadra_CV.docx")!.async("uint8array");
    const rels = await (await JSZip.loadAsync(docx))
      .file("word/_rels/document.xml.rels")!
      .async("string");
    // Short links from the spec: portfolio carries the profile letter ("p" for payments).
    expect(rels).toContain('Target="https://lenincuadra.com/r/0628a2Pp"');
    expect(rels).toContain('Target="https://lenincuadra.com/r/0628a2L"');
    expect(rels).toContain('Target="https://lenincuadra.com/r/0628a2G"');
    expect(result.row.links).toEqual({
      portfolio: "https://lenincuadra.com/r/0628a2Pp",
      linkedin: "https://lenincuadra.com/r/0628a2L",
      github: "https://lenincuadra.com/r/0628a2G",
    });
  });

  it("uses a precomputed code verbatim (preview path)", async () => {
    const result = await generateCv(
      { company: "GlobalLogic", languageChoice: "EN", date: new Date(2026, 5, 28), code: "0628z9" },
      deps({ now: fixedNow }),
    );
    expect(result.code).toBe("0628z9");
    expect(result.folderNames).toEqual(["EN_globallogic_0628z9"]);
  });

  it("ships the cover letter in each folder that has a body, and records it on the row", async () => {
    const result = await generateCv(
      {
        company: "Acme",
        languageChoice: "Ambos",
        date: new Date(2026, 5, 28),
        coverLetter: {
          templateId: "t-1",
          templateName: "Fintech",
          // Only EN has a body: the ES folder ships without a letter.
          bodies: { EN: "Dear team, I want to join Acme." },
        },
      },
      deps({ rng: fixedRng, now: fixedNow }),
    );

    const zip = await JSZip.loadAsync(result.zip);
    expect(zip.file("EN_acme_0628a2/Lenin_Cuadra_Cover_Letter.docx")).not.toBeNull();
    expect(zip.file("ES_acme_0628a2/Lenin_Cuadra_Cover_Letter.docx")).toBeNull();
    expect(zip.file("EN_acme_0628a2/Lenin_Cuadra_CV.docx")).not.toBeNull();

    // Faithful record: only the body that actually shipped.
    expect(result.row.coverLetter).toEqual({
      templateId: "t-1",
      templateName: "Fintech",
      bodies: { EN: "Dear team, I want to join Acme." },
    });
    // Entries expose the letter bytes for future sinks.
    expect(result.entries.find((entry) => entry.language === "EN")?.coverLetter).toBeDefined();
    expect(result.entries.find((entry) => entry.language === "ES")?.coverLetter).toBeUndefined();
  });

  it("records no cover letter when the bodies are empty", async () => {
    const result = await generateCv(
      {
        company: "Acme",
        languageChoice: "EN",
        date: new Date(2026, 5, 28),
        coverLetter: { templateId: "t-1", bodies: { ES: "No aplica al idioma elegido." } },
      },
      deps({ rng: fixedRng, now: fixedNow }),
    );
    expect(result.row.coverLetter).toBeUndefined();
    const zip = await JSZip.loadAsync(result.zip);
    expect(zip.file("EN_acme_0628a2/Lenin_Cuadra_Cover_Letter.docx")).toBeNull();
  });
});
