import type { CoverLetterBodies, CoverLetterRecord } from "../coverLetter/types";
import type { CvContentOverrides } from "../cvData/docx";
import type { ParsedJd, VerifiedClaims } from "../jdParse/types";
import type { TrackedLinks } from "../spec/links";
import type { Language, LanguageChoice } from "../types";

/** Application channels (no "Referido" — a referral can apply via any channel). */
export const CHANNELS = [
  "LinkedIn",
  "Email",
  "Bolsa de trabajo",
  "Sitio de la empresa",
] as const;

export type Channel = (typeof CHANNELS)[number];

/**
 * "Borrador" is system-derived (mirrors `cvPending`), never manually set —
 * it's what a row is while registered but not yet sent (via "Guardar sin CV"
 * or an AI cover-letter draft started mid-wizard). It flips to "Activo" the
 * moment the CV actually generates. Not user-toggleable like the others.
 *
 * The three user-settable states double as the funnel's outcome/color:
 * "Activo" (en curso, ámbar), "Rechazado" (terminó mal, rojo) and "Aceptado"
 * (terminó bien, verde). Marking a process finished = moving it to Rechazado
 * or Aceptado; the stage where it ended is the deepest funnel stage reached
 * (see core/funnel.ts). Only one outcome per row.
 */
export type ApplicationStatus = "Borrador" | "Activo" | "Rechazado" | "Aceptado";

/**
 * How the CV body was built for this application — chosen at the start of the
 * wizard. A spectrum of how much the CV adapts to the job description (see
 * `docs/cv-tailoring-plan.md`):
 * - "base": the fixed master + tracked links (the app's original behavior).
 * - "assisted": AI rewrites Lenin's real experience into the JD's language.
 * - "verbatim": the JD's exact phrases injected, gated by human verification.
 * - "ats": a fresh CV built from scratch per JD (from structured cvData, not
 *   the master) — full guide strategy: JD title, verbatim Core Competencies,
 *   Values Alignment. JD paste is mandatory; gated by human verification.
 * Absent on a row = "base" (legacy rows, and the deferred-generation flow which
 * does not offer the selector yet).
 */
export type CvMode = "base" | "assisted" | "verbatim" | "ats";

export const DEFAULT_ROLE = "UX/UI Designer";
export const DEFAULT_STATUS: ApplicationStatus = "Activo";
export const DEFAULT_CV_MODE: CvMode = "base";

/** Max follow-up updates kept per application. */
export const MAX_UPDATES = 12;

/** One follow-up entry in the application timeline (Seguimiento › Actualizaciones). */
export interface StatusUpdate {
  /** ISO timestamp (date + time) when the update was logged. Editable. */
  at: string;
  /** Free-text note about the application's progress. */
  message: string;
  /** Marked important / to-do (shown with 🚩). */
  flag?: boolean;
  /**
   * Funnel milestone this entry annotates. Every user-added item hangs off a
   * milestone; absent = unclassified (legacy items, or the system "CV generado"
   * marker) — shown under "Sin hito" so it can be reassigned.
   */
  milestone?: MilestoneKey;
}

/**
 * Funnel milestones, in AARRR order (Acquisition → Referral). "sent" (CV
 * enviado) is auto-marked when a CV is generated but can be unmarked (e.g. the
 * CV never actually went out), so the first process step can carry annotations
 * too — not just "Respuesta recibida", which often never comes (ghosting).
 */
export const MILESTONE_KEYS = ["sent", "responded", "interview", "offer", "referral"] as const;

export type MilestoneKey = (typeof MILESTONE_KEYS)[number];

/**
 * Date each milestone was reached, "YYYY-MM-DD" (same convention as `date`).
 * Absent key = not reached. Set manually from the detail drawer
 * (Seguimiento › Actualizaciones); feeds the AARRR funnel (core/funnel.ts).
 */
export type Milestones = Partial<Record<MilestoneKey, string>>;

/**
 * One registry row per application.
 * The table shows 7 columns (code, company, role, channel, date, notes, status);
 * the remaining fields are captured for the audit trail but not displayed.
 */
export interface RegistryRow {
  /** Tracking code — unique, primary key. */
  code: string;
  company: string;
  role: string;
  /** Undefined = "omitir". */
  channel?: Channel;
  /** Email applied to — required when channel is "Email". */
  email?: string;
  /** Application date as "YYYY-MM-DD". */
  date: string;
  notes?: string;
  status: ApplicationStatus;
  // --- captured but not shown as table columns ---
  /** Recruiter or contact. */
  who?: string;
  /** Posting URL. */
  jobUrl?: string;
  /**
   * Free-text requirements/highlights from the posting — extra grounding for
   * the AI pipeline beyond company/role/focus. Optional, hand-pasted or
   * best-effort auto-filled from `jobUrl`'s JobPosting schema (JSON-LD).
   */
  jobContext?: string;
  /**
   * Structured parse of the job description — AI-extracted from `jobContext`.
   * Present when the posting was detected or analyzed (modes 2/3); absent on
   * mode 1 base rows and legacy rows. Source of keywords, tools, and section
   * headers for the CV tailoring pipeline.
   */
  parsedJd?: ParsedJd;
  /** Language choice the user picked (EN / ES / Ambos). */
  language?: LanguageChoice;
  /**
   * Portfolio focus profile baked into the CV's tracked links (`&focus=`).
   * Like `language`, not editable post-creation: the sent CV already carries it.
   */
  focus?: string;
  /**
   * How the CV body was built (see `CvMode`). Faithful record of how the sent
   * CV was tailored — like `focus`/`language`, not editable post-creation.
   * Absent = "base" (legacy rows and the deferred-generation flow).
   */
  cvMode?: CvMode;
  /**
   * Verbatim claims verified in the Modo 3 gate before generation. Faithful
   * record of what Lenin confirmed — absent on modes 1/2 and legacy rows.
   */
  verifiedClaims?: VerifiedClaims;
  /**
   * The JD-tailored content injected into the ATS-mode CV (title, Core
   * Competencies, Values Alignment, summary). Faithful record — ATS mode only.
   */
  atsOverrides?: CvContentOverrides;
  /** The three tracked links (short form) baked into this CV — faithful record. */
  links?: TrackedLinks;
  /**
   * Cover letter actually sent: template + final per-language markdown (after
   * variable resolution and per-application edits). Like `links`, a faithful
   * record — read-only post-creation.
   */
  coverLetter?: CoverLetterRecord;
  /**
   * Cover letter draft in progress (pre-send) — written by the AI pipeline
   * the moment it generates a body, so a paid generation is never lost to a
   * closed wizard. Mutable, unlike `coverLetter`; only meaningful while
   * `cvPending` is true (the wizard's step 4 preloads it on resume).
   */
  coverLetterDraft?: { templateId: string; templateName?: string; bodies: CoverLetterBodies };
  /** File name of the archived delivery zip in data/cvs/ (set at generation). */
  zipName?: string;
  /** Google Doc URL per generated language (Docs sink), filled after the upload. */
  driveDocs?: Partial<Record<Language, string>>;
  /** Cover letter's Google Doc URL per language — mirror of driveDocs. */
  driveLetterDocs?: Partial<Record<Language, string>>;
  /** Drive folder that holds this application's Doc(s) — one per application. */
  driveFolder?: string;
  /** Creation timestamp (ISO). */
  createdAt?: string;
  /** Follow-up timeline (Seguimiento › Actualizaciones), oldest first. */
  updates?: StatusUpdate[];
  /** Funnel milestones reached (dates). Absent = none. */
  milestones?: Milestones;
  /** Archived = moved out of the active searches view. Independent of status. */
  archived?: boolean;
  /**
   * Process registered but no CV generated yet (e.g. a recruiter reached out).
   * The code is already reserved; cleared when the CV is generated later.
   * Absent on rows created by a generation (they always have a CV).
   */
  cvPending?: boolean;
  /**
   * Delivered files archived durably (paths under the CV archive, e.g.
   * "EN_acme_0628r4/Lenin_Cuadra_CV.docx"), downloadable via GET /api/cvs/.
   * Set after a successful archive — like driveDocs, absent means "not there".
   */
  deliveryFiles?: string[];
}

/**
 * Fields editable from the detail panel after creation — everything except the
 * tracking code (identity, already baked into the sent CV) and createdAt.
 */
export type EditableFields = Partial<Omit<RegistryRow, "code" | "createdAt">>;

/**
 * Row's display name: the empresa, or the contacto (`who`) when there's no
 * empresa yet (a contact-only draft — the two are interchangeable as the label),
 * or a neutral fallback. Used by the detail drawer title and delete confirmation.
 */
export function displayName(row: Pick<RegistryRow, "company" | "who">): string {
  return row.company.trim() || row.who?.trim() || "Sin empresa";
}

/**
 * Storage abstraction for the registry. Local implementation now,
 * Supabase later — without touching core/ or ui/.
 */
export interface RegistryStore {
  list(): Promise<RegistryRow[]>;
  add(row: RegistryRow): Promise<void>;
  update(code: string, fields: EditableFields): Promise<void>;
  /** Permanently delete a row by code. */
  remove(code: string): Promise<void>;
  existingCodes(): Promise<string[]>;
}
