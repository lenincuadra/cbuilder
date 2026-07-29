import { buildCoverLetterDocx } from "./coverLetter/docx";
import type { CoverLetterBodies, CoverLetterRecord } from "./coverLetter/types";
import { toISODate } from "./dates";
import { fillMaster } from "./docx";
import { folderName, slugifyCompany } from "./folderName";
import { generateCode } from "./spec/code";
import { buildTrackedLinks } from "./spec/links";
import type { LinkSpec } from "./spec/types";
import { languagesFor, type Language, type LanguageChoice } from "./types";
import { packageCvs, type CvEntry } from "./zip";
import { buildAssistedSlots, buildVerbatimSlots } from "./jdParse/slots";
import type { ParsedJd, VerifiedClaims } from "./jdParse/types";
import { cvDataFor } from "./cvData";
import { buildCvDocx, type CvContentOverrides } from "./cvData/docx";
import {
  DEFAULT_ROLE,
  DEFAULT_STATUS,
  MAX_UPDATES,
  type ApplicationStatus,
  type Channel,
  type CvMode,
  type EditableFields,
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
  /** Free-text requirements/highlights from the posting — extra AI grounding. */
  jobContext?: string;
  /** Structured parse of the job description (AI-extracted). */
  parsedJd?: ParsedJd;
  /** Verbatim claims verified in the Modo 3 gate (see `VerifiedClaims`). */
  verifiedClaims?: VerifiedClaims;
  /** AI-drafted professional summaries per language (Modo 2 — Asistido). */
  assistedSummaries?: Partial<Record<Language, string>>;
  /**
   * Verified JD-tailored content for the ATS mode (title, Core Competencies,
   * Values Alignment, summary). Applied to every language's fresh-built CV.
   */
  atsOverrides?: CvContentOverrides;
  notes?: string;
  status?: ApplicationStatus;
  /** Portfolio focus profile id (from the spec) baked into the CV's tracked links. */
  focus?: string;
  /** How the CV body was tailored (see `CvMode`). Persisted as a faithful record. */
  cvMode?: CvMode;
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

  // Verbatim slots are language-independent (same verified claims for every language).
  const verbatimSlots =
    input.cvMode === "verbatim" && input.parsedJd && input.verifiedClaims
      ? buildVerbatimSlots(input.parsedJd, input.verifiedClaims)
      : undefined;

  const entries: CvEntry[] = [];
  const sentBodies: CoverLetterBodies = {};
  for (const language of languagesFor(input.languageChoice)) {
    let docx: Uint8Array;
    if (input.cvMode === "ats") {
      // ATS mode builds a fresh CV from structured data (never the master),
      // overlaying the verified JD-tailored content.
      docx = await buildCvDocx(cvDataFor(language), links, input.atsOverrides ?? {});
    } else {
      const master = await deps.loadMaster(language);
      // Assisted slots are per-language (each language gets its own AI draft).
      const slots =
        input.cvMode === "assisted" && input.assistedSummaries?.[language]
          ? buildAssistedSlots(input.assistedSummaries[language]!)
          : verbatimSlots;
      docx = await fillMaster(master, links, slots);
    }
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
    jobContext: cleaned(input.jobContext),
    parsedJd: input.parsedJd,
    verifiedClaims: input.verifiedClaims,
    atsOverrides: input.atsOverrides,
    language: input.languageChoice,
    focus: input.focus,
    cvMode: input.cvMode,
    links,
    coverLetter,
    zipName,
    createdAt: now().toISOString(),
    // The CV shipped now: auto-mark the "sent" milestone (unmarkable later) and
    // log it, so the first funnel step ("CV enviado") can hold annotations.
    milestones: { sent: toISODate(now()) },
    updates: [{ at: now().toISOString(), message: "CV generado", milestone: "sent" }],
  };

  return { code, folderNames: entries.map((entry) => entry.folder), entries, zipName, zip, row };
}

/** Process data captured when registering an application without a CV. */
export interface PendingRowInput {
  company: string;
  date: Date;
  role?: string;
  who?: string;
  channel?: Channel;
  /** Email applied to — validated caller-side; an invalid one is omitted, never stored. */
  email?: string;
  jobUrl?: string;
  /** Free-text requirements/highlights from the posting — extra AI grounding. */
  jobContext?: string;
  /** Structured parse of the job description (AI-extracted). */
  parsedJd?: ParsedJd;
  /**
   * A cover letter written mid-wizard before registering without CV — kept as
   * the row's draft so nothing typed (or AI-generated) is lost; the deferred
   * generation preloads it in its letter step.
   */
  coverLetterDraft?: CoverLetterRecord;
  /**
   * Precomputed tracking code (e.g. the wizard's already-shown folder-name
   * preview). When provided it is used as-is, so a row created silently
   * behind an optional action (cover letter/preguntas) in the confirm step
   * lands on the exact code already displayed there — otherwise a fresh,
   * collision-checked code is generated.
   */
  code?: string;
}

export interface PendingRowDeps {
  /** The link contract — supplies the code format and reserved refs. */
  spec: LinkSpec;
  /** Codes already in the registry (collision set). */
  existingCodes: string[];
  /** Injectable RNG for deterministic tests. */
  rng?: () => number;
  /** Injectable clock for the createdAt timestamp. */
  now?: () => Date;
}

/**
 * Build a registry row for a process that started without a CV (e.g. a
 * recruiter reached out). Reserves a collision-checked tracking code now, so
 * the deferred generation later uses the same identity; everything CV-specific
 * (language, focus, links, letter, delivery) stays unset until then.
 */
export function buildPendingRow(input: PendingRowInput, deps: PendingRowDeps): RegistryRow {
  const code =
    input.code ??
    generateCode({
      spec: deps.spec,
      date: input.date,
      existingCodes: deps.existingCodes,
      rng: deps.rng,
    });
  const now = deps.now ?? (() => new Date());
  return {
    code,
    company: input.company.trim(),
    role: cleaned(input.role) ?? DEFAULT_ROLE,
    channel: input.channel,
    email: input.channel === "Email" ? cleaned(input.email) : undefined,
    date: toISODate(input.date),
    // Not yet sent — distinct from DEFAULT_STATUS ("Activo"), which implies a
    // real submitted application. Flips to Activo in deferredGenerationFields.
    status: "Borrador",
    who: cleaned(input.who),
    jobUrl: cleaned(input.jobUrl),
    jobContext: cleaned(input.jobContext),
    parsedJd: input.parsedJd,
    coverLetterDraft: input.coverLetterDraft,
    createdAt: now().toISOString(),
    cvPending: true,
  };
}

/**
 * Fields to apply on a pending row once its CV is generated: the CV-specific
 * data from the generation, the cleared pending flag, and an automatic
 * timeline entry ("CV generado") so the delay between registering the process
 * and sending the CV stays visible. The row's date (process start) is kept.
 */
export function deferredGenerationFields(
  row: RegistryRow,
  result: GenerateCvResult,
  now: () => Date = () => new Date(),
): EditableFields {
  const generated = result.row;
  const updates = [
    ...(row.updates ?? []),
    { at: now().toISOString(), message: "CV generado", milestone: "sent" as const },
  ].slice(-MAX_UPDATES);
  return {
    cvPending: false,
    // Borrador → Activo: the CV actually shipped now, same as a fresh row.
    status: "Activo",
    language: generated.language,
    focus: generated.focus,
    links: generated.links,
    // A letter delivered while still pending (post-hoc form, confirm step)
    // sits only on `row` — the generation itself carries no letter anymore.
    coverLetter: generated.coverLetter ?? row.coverLetter,
    zipName: generated.zipName,
    updates,
    // Auto-mark "CV enviado" now that the CV shipped (keeps the earlier date).
    milestones: { ...(row.milestones ?? {}), sent: toISODate(now()) },
  };
}
