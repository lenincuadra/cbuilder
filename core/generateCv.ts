import { buildCoverLetterDocx } from "./coverLetter/docx";
import type { CoverLetterBodies, CoverLetterRecord } from "./coverLetter/types";
import { toISODate } from "./dates";
import { fillMaster } from "./docx";
import { folderName, slugifyCompany } from "./folderName";
import { generateCode } from "./spec/code";
import { buildTrackedLinks } from "./spec/links";
import type { LinkSpec } from "./spec/types";
import type { Language, LanguageChoice } from "./types";
import { packageCvs, type CvEntry } from "./zip";
import {
  DEFAULT_ROLE,
  DEFAULT_STATUS,
  type ApplicationStatus,
  type Channel,
  type RegistryRow,
} from "./registry/types";

export interface GenerateCvInput {
  company: string;
  languageChoice: LanguageChoice;
  date: Date;
  role?: string;
  who?: string;
  channel?: Channel;
  /** Email applied to — required when channel is "Email". */
  email?: string;
  jobUrl?: string;
  notes?: string;
  status?: ApplicationStatus;
  /** Portfolio focus profile id (from the spec) baked into the CV's tracked links. */
  focus?: string;
  /**
   * Cover letter to generate alongside the CV: final per-language markdown
   * (variables already resolved and hand-edited in the wizard). Languages
   * without a body simply ship without a letter.
   */
  coverLetter?: CoverLetterRecord;
  /**
   * Precomputed tracking code (e.g. from the wizard's folder-name preview).
   * When provided it is used as-is; otherwise a fresh, collision-checked code
   * is generated. Lets the preview match the final output exactly.
   */
  code?: string;
}

export interface GenerateCvDeps {
  /** The link contract — supplies the code format, reserved refs and link templates. */
  spec: LinkSpec;
  /** Codes already in the registry (collision set). */
  existingCodes: string[];
  /** Load the master .docx bytes for a concrete language. */
  loadMaster: (language: Language) => Promise<Uint8Array>;
  /** Injectable RNG for deterministic tests. */
  rng?: () => number;
  /** Injectable clock for the createdAt timestamp. */
  now?: () => Date;
}

export interface GenerateCvResult {
  code: string;
  folderNames: string[];
  /** Per-language filled CVs (also inside the zip) — for extra sinks like Google Docs. */
  entries: CvEntry[];
  /** Delivery zip file name (single language: `<folder>.zip`; Ambos: `<slug>_<code>.zip`). */
  zipName: string;
  /** Final delivery .zip bytes. */
  zip: Uint8Array;
  /** Registry row to persist (caller decides when to store it). */
  row: RegistryRow;
}

function languagesFor(choice: LanguageChoice): Language[] {
  return choice === "Ambos" ? ["EN", "ES"] : [choice];
}

function cleaned(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Orchestrate a CV generation: pick a unique code, fill the master(s),
 * package the delivery zip, and build the registry row. Pure given its deps
 * (no persistence, no fetch) — the caller stores the row and downloads the zip.
 */
export async function generateCv(
  input: GenerateCvInput,
  deps: GenerateCvDeps,
): Promise<GenerateCvResult> {
  const code =
    input.code ??
    generateCode({
      spec: deps.spec,
      date: input.date,
      existingCodes: deps.existingCodes,
      rng: deps.rng,
    });

  // Build the three tracked links (short form) once from the spec; bake them
  // into every master and persist them on the row (faithful record of what was sent).
  const links = buildTrackedLinks(deps.spec, code, input.focus);

  const entries: CvEntry[] = [];
  const sentBodies: CoverLetterBodies = {};
  for (const language of languagesFor(input.languageChoice)) {
    const master = await deps.loadMaster(language);
    const docx = await fillMaster(master, links);
    const letterBody = input.coverLetter?.bodies[language]?.trim();
    let coverLetter: Uint8Array | undefined;
    if (letterBody) {
      coverLetter = await buildCoverLetterDocx({ language, bodyMarkdown: letterBody, date: input.date });
      sentBodies[language] = letterBody;
    }
    entries.push({
      folder: folderName({ language, company: input.company, code }),
      language,
      docx,
      coverLetter,
    });
  }
  // Persist only what actually shipped (the faithful-record rule, like links).
  const coverLetter: CoverLetterRecord | undefined =
    input.coverLetter && Object.keys(sentBodies).length > 0
      ? { ...input.coverLetter, bodies: sentBodies }
      : undefined;

  const zip = await packageCvs(entries);
  const zipName =
    entries.length === 1
      ? `${entries[0].folder}.zip`
      : `${slugifyCompany(input.company)}_${code}.zip`;
  const now = deps.now ?? (() => new Date());

  const row: RegistryRow = {
    code,
    company: input.company.trim(),
    role: cleaned(input.role) ?? DEFAULT_ROLE,
    channel: input.channel,
    email: input.channel === "Email" ? cleaned(input.email) : undefined,
    date: toISODate(input.date),
    notes: cleaned(input.notes),
    status: input.status ?? DEFAULT_STATUS,
    who: cleaned(input.who),
    jobUrl: cleaned(input.jobUrl),
    language: input.languageChoice,
    focus: input.focus,
    links,
    coverLetter,
    zipName,
    createdAt: now().toISOString(),
  };

  return { code, folderNames: entries.map((entry) => entry.folder), entries, zipName, zip, row };
}
