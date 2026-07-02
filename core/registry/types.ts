import type { LanguageChoice } from "../types";

/** Application channels (no "Referido" — a referral can apply via any channel). */
export const CHANNELS = [
  "LinkedIn",
  "Email",
  "Bolsa de trabajo",
  "Sitio de la empresa",
] as const;

export type Channel = (typeof CHANNELS)[number];

export type ApplicationStatus = "Activo" | "Rechazado";

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
  /** Language choice the user picked (EN / ES / Ambos). */
  language?: LanguageChoice;
  /** Creation timestamp (ISO). */
  createdAt?: string;
  /** Follow-up timeline (Seguimiento › Actualizaciones), oldest first. */
  updates?: StatusUpdate[];
  /** Archived = moved out of the active searches view. Independent of status. */
  archived?: boolean;
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
  existingCodes(): Promise<string[]>;
}
