import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildPendingRow, deferredGenerationFields, generateCv } from "./generateCv";
import { MAX_UPDATES } from "./registry/types";
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

describe("buildPendingRow", () => {
  it("reserves a collision-checked code and marks the row pending, no CV fields", () => {
    const row = buildPendingRow(
      {
        company: "  Acme  ",
        date: new Date(2026, 5, 28),
        who: "Jane Recruiter",
        channel: "LinkedIn",
      },
      { spec: TEST_SPEC, existingCodes: ["0628a2"], rng: codeRng([[0, 0], [1, 1]]), now: fixedNow },
    );

    expect(row.code).toBe("0628b3"); // 0628a2 taken → next attempt
    expect(row.cvPending).toBe(true);
    expect(row.company).toBe("Acme");
    expect(row.role).toBe("UX/UI Designer");
    expect(row.status).toBe("Borrador");
    expect(row.date).toBe("2026-06-28");
    expect(row.who).toBe("Jane Recruiter");
    expect(row.createdAt).toBe("2026-06-28T12:00:00.000Z");
    // Nothing CV-specific until the deferred generation.
    expect(row.language).toBeUndefined();
    expect(row.focus).toBeUndefined();
    expect(row.links).toBeUndefined();
    expect(row.zipName).toBeUndefined();
  });

  it("keeps the email only for the Email channel", () => {
    const base = { company: "Acme", date: new Date(2026, 5, 28), email: "jobs@acme.com" };
    const emailRow = buildPendingRow(
      { ...base, channel: "Email" },
      { spec: TEST_SPEC, existingCodes: [], rng: fixedRng, now: fixedNow },
    );
    expect(emailRow.email).toBe("jobs@acme.com");

    const otherRow = buildPendingRow(
      { ...base, channel: "LinkedIn" },
      { spec: TEST_SPEC, existingCodes: [], rng: fixedRng, now: fixedNow },
    );
    expect(otherRow.email).toBeUndefined();
  });

  it("carries a mid-wizard cover letter draft onto the row", () => {
    const draft = {
      templateId: "__ai__",
      templateName: "Generado con IA",
      bodies: { EN: "Dear team…" },
    };
    const row = buildPendingRow(
      { company: "Acme", date: new Date(2026, 5, 28), coverLetterDraft: draft },
      { spec: TEST_SPEC, existingCodes: [], rng: fixedRng, now: fixedNow },
    );
    expect(row.coverLetterDraft).toEqual(draft);
  });
});

describe("deferredGenerationFields", () => {
  it("clears the pending flag, applies the CV fields and logs 'CV generado'", async () => {
    const pending = buildPendingRow(
      { company: "Acme", date: new Date(2026, 5, 28) },
      { spec: TEST_SPEC, existingCodes: [], rng: fixedRng, now: fixedNow },
    );
    const result = await generateCv(
      {
        company: "Acme",
        languageChoice: "EN",
        date: new Date(2026, 6, 15),
        focus: "payments",
        code: pending.code,
      },
      deps({ now: fixedNow }),
    );

    const fields = deferredGenerationFields(pending, result, () => new Date("2026-07-15T10:00:00.000Z"));
    expect(fields.cvPending).toBe(false);
    expect(fields.status).toBe("Activo"); // Borrador → Activo now that the CV shipped.
    expect(fields.language).toBe("EN");
    expect(fields.focus).toBe("payments");
    expect(fields.links).toEqual(result.row.links);
    expect(fields.zipName).toBe(result.zipName);
    expect(fields.updates).toEqual([
      { at: "2026-07-15T10:00:00.000Z", message: "CV generado", milestone: "sent" },
    ]);
    // "CV enviado" is auto-marked when the deferred CV ships.
    expect(fields.milestones).toEqual({ sent: "2026-07-15" });
    // The process-start date is not among the updated fields.
    expect("date" in fields).toBe(false);
  });

  it("appends to the existing timeline and respects the cap", async () => {
    const pending = buildPendingRow(
      { company: "Acme", date: new Date(2026, 5, 28) },
      { spec: TEST_SPEC, existingCodes: [], rng: fixedRng, now: fixedNow },
    );
    pending.updates = Array.from({ length: MAX_UPDATES }, (_, index) => ({
      at: `2026-07-0${(index % 9) + 1}T00:00:00.000Z`,
      message: `update ${index}`,
    }));
    const result = await generateCv(
      { company: "Acme", languageChoice: "EN", date: new Date(2026, 6, 15), code: pending.code },
      deps({ now: fixedNow }),
    );

    const fields = deferredGenerationFields(pending, result, () => new Date("2026-07-15T10:00:00.000Z"));
    expect(fields.updates).toHaveLength(MAX_UPDATES);
    // Oldest dropped, newest is the automatic entry.
    expect(fields.updates?.[0].message).toBe("update 1");
    expect(fields.updates?.at(-1)?.message).toBe("CV generado");
  });
});
