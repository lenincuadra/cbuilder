import type { Language } from "../types";

/** Markdown body per language; a template may define one or both. */
export type CoverLetterBodies = Partial<Record<Language, string>>;

/**
 * A cover letter template: reusable markdown per application type
 * ("Fintech / Payments", "AI products", …). The body carries {company}/{role}/
 * {who} variables that get resolved (and hand-edited) per application in the
 * wizard — the template itself never changes at generation time.
 */
export interface CoverLetterTemplate {
  /** Stable unique id (generated at creation; the name stays freely editable). */
  id: string;
  /** Human label shown in the manager and the wizard, e.g. "Fintech / Payments". */
  name: string;
  bodies: CoverLetterBodies;
  /** Creation timestamp (ISO). */
  createdAt?: string;
}

/**
 * What gets persisted on the registry row: the final per-language markdown that
 * actually went into the generated .docx (after variable resolution and any
 * per-application edits). Faithful record of what was sent — read-only
 * post-creation, like the tracked links.
 */
export interface CoverLetterRecord {
  templateId: string;
  /** Template name at generation time (survives a later template rename/delete). */
  templateName?: string;
  bodies: CoverLetterBodies;
}

/** Variables a template body may reference, filled from the wizard fields. */
export const TEMPLATE_VARS = ["company", "role", "who"] as const;
export type TemplateVarName = (typeof TEMPLATE_VARS)[number];
export type TemplateVars = Partial<Record<TemplateVarName, string>>;

/**
 * Resolve {company}/{role}/{who} placeholders in a template body. Missing or
 * empty values resolve to "" — the wizard shows the result in an editable
 * preview, so the user sees (and can fix) any gap before generating.
 */
export function resolveTemplateVars(body: string, vars: TemplateVars): string {
  return body.replace(/\{(company|role|who)\}/g, (_match, name: TemplateVarName) => {
    return vars[name]?.trim() ?? "";
  });
}

/** Fields editable after creation — everything except identity/timestamps. */
export type EditableTemplateFields = Partial<Omit<CoverLetterTemplate, "id" | "createdAt">>;

/** Keep only EN/ES string bodies from untrusted input; drop anything else. */
export function sanitizeBodies(input: unknown): CoverLetterBodies {
  const bodies: CoverLetterBodies = {};
  if (input && typeof input === "object") {
    for (const language of ["EN", "ES"] as const) {
      const value = (input as Record<string, unknown>)[language];
      if (typeof value === "string" && value.trim() !== "") bodies[language] = value;
    }
  }
  return bodies;
}

/**
 * Storage for the templates. Same triple-store pattern as the registry:
 * file store locally, Supabase on deploy, API store in the browser.
 */
export interface CoverLetterTemplatesStore {
  list(): Promise<CoverLetterTemplate[]>;
  add(template: CoverLetterTemplate): Promise<void>;
  update(id: string, fields: EditableTemplateFields): Promise<void>;
  remove(id: string): Promise<void>;
}
