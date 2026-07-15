import type { CoverLetterBodies, CoverLetterRecord } from "../coverLetter/types";
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
 * moment the CV actually generates. Not user-toggleable like Activo/Rechazado.
 */
export type ApplicationStatus = "Borrador" | "Activo" | "Rechazado";

export const DEFAULT_ROLE = "UX/UI Designer";
export const DEFAULT_STATUS: ApplicationStatus = "Activo";

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
}

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
  /** Language choice the user picked (EN / ES / Ambos). */
  language?: LanguageChoice;
  /**
   * Portfolio focus profile baked into the CV's tracked links (`&focus=`).
   * Like `language`, not editable post-creation: the sent CV already carries it.
   */
  focus?: string;
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
  /** Drive folder that holds this application's Doc(s) — one per application. */
  driveFolder?: string;
  /** Creation timestamp (ISO). */
  createdAt?: string;
  /** Follow-up timeline (Seguimiento › Actualizaciones), oldest first. */
  updates?: StatusUpdate[];
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
