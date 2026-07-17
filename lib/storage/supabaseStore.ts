import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationStatus,
  Channel,
  EditableFields,
  Milestones,
  RegistryRow,
  RegistryStore,
  StatusUpdate,
} from "../../core/registry/types";
import type { CoverLetterBodies, CoverLetterRecord } from "../../core/coverLetter/types";
import type { TrackedLinks } from "../../core/spec/links";
import type { Language, LanguageChoice } from "../../core/types";

const TABLE = "registry";

/** Shape of a row as stored in Postgres (snake_case columns). */
interface RegistryRowDb {
  code: string;
  company: string;
  role: string;
  channel: string | null;
  email: string | null;
  date: string;
  notes: string | null;
  status: string;
  who: string | null;
  job_url: string | null;
  job_context: string | null;
  language: string | null;
  focus: string | null;
  zip_name: string | null;
  drive_docs: Partial<Record<Language, string>> | null;
  links: TrackedLinks | null;
  cover_letter: CoverLetterRecord | null;
  cover_letter_draft: { templateId: string; templateName?: string; bodies: CoverLetterBodies } | null;
  drive_folder: string | null;
  created_at: string | null;
  updates: StatusUpdate[] | null;
  milestones: Milestones | null;
  archived: boolean | null;
  cv_pending: boolean | null;
  delivery_files: string[] | null;
}

export function dbToRow(db: RegistryRowDb): RegistryRow {
  return {
    code: db.code,
    company: db.company,
    role: db.role,
    channel: (db.channel ?? undefined) as Channel | undefined,
    email: db.email ?? undefined,
    date: db.date,
    notes: db.notes ?? undefined,
    status: db.status as ApplicationStatus,
    who: db.who ?? undefined,
    jobUrl: db.job_url ?? undefined,
    jobContext: db.job_context ?? undefined,
    language: (db.language ?? undefined) as LanguageChoice | undefined,
    focus: db.focus ?? undefined,
    zipName: db.zip_name ?? undefined,
    driveDocs: db.drive_docs ?? undefined,
    links: db.links ?? undefined,
    coverLetter: db.cover_letter ?? undefined,
    coverLetterDraft: db.cover_letter_draft ?? undefined,
    driveFolder: db.drive_folder ?? undefined,
    createdAt: db.created_at ?? undefined,
    updates: db.updates ?? undefined,
    milestones: db.milestones ?? undefined,
    archived: db.archived ?? undefined,
    // false (the column default, also every pre-existing row) maps back to
    // "absent", so rows with a CV keep their original shape.
    cvPending: db.cv_pending ? true : undefined,
    deliveryFiles: db.delivery_files ?? undefined,
  };
}

export function rowToDb(row: RegistryRow): RegistryRowDb {
  return {
    code: row.code,
    company: row.company,
    role: row.role,
    channel: row.channel ?? null,
    email: row.email ?? null,
    date: row.date,
    notes: row.notes ?? null,
    status: row.status,
    who: row.who ?? null,
    job_url: row.jobUrl ?? null,
    job_context: row.jobContext ?? null,
    language: row.language ?? null,
    focus: row.focus ?? null,
    zip_name: row.zipName ?? null,
    drive_docs: row.driveDocs ?? null,
    links: row.links ?? null,
    cover_letter: row.coverLetter ?? null,
    cover_letter_draft: row.coverLetterDraft ?? null,
    drive_folder: row.driveFolder ?? null,
    // These three columns are NOT NULL with a default in Postgres. An explicit
    // null would override the default and violate the constraint, so fall back to
    // the schema default value instead of null (a fresh row leaves them unset).
    created_at: row.createdAt ?? new Date().toISOString(),
    updates: row.updates ?? [],
    milestones: row.milestones ?? null,
    archived: row.archived ?? false,
    cv_pending: row.cvPending ?? false,
    delivery_files: row.deliveryFiles ?? null,
  };
}

export function editableToDb(fields: EditableFields): Partial<RegistryRowDb> {
  const out: Partial<RegistryRowDb> = {};
  if ("company" in fields) out.company = fields.company as string;
  if ("role" in fields) out.role = fields.role as string;
  if ("channel" in fields) out.channel = fields.channel ?? null;
  if ("email" in fields) out.email = fields.email ?? null;
  if ("date" in fields) out.date = fields.date as string;
  if ("who" in fields) out.who = fields.who ?? null;
  if ("jobUrl" in fields) out.job_url = fields.jobUrl ?? null;
  if ("jobContext" in fields) out.job_context = fields.jobContext ?? null;
  if ("language" in fields) out.language = fields.language ?? null;
  if ("focus" in fields) out.focus = fields.focus ?? null;
  if ("zipName" in fields) out.zip_name = fields.zipName ?? null;
  if ("driveDocs" in fields) out.drive_docs = fields.driveDocs ?? null;
  if ("links" in fields) out.links = fields.links ?? null;
  if ("coverLetter" in fields) out.cover_letter = fields.coverLetter ?? null;
  if ("coverLetterDraft" in fields) out.cover_letter_draft = fields.coverLetterDraft ?? null;
  if ("driveFolder" in fields) out.drive_folder = fields.driveFolder ?? null;
  if ("notes" in fields) out.notes = fields.notes ?? null;
  if ("status" in fields) out.status = fields.status as string;
  if ("updates" in fields) out.updates = fields.updates ?? [];
  if ("milestones" in fields) out.milestones = fields.milestones ?? null;
  if ("archived" in fields) out.archived = fields.archived ?? false;
  if ("cvPending" in fields) out.cv_pending = fields.cvPending ?? false;
  if ("deliveryFiles" in fields) out.delivery_files = fields.deliveryFiles ?? null;
  return out;
}

/**
 * RegistryStore backed by Supabase (Postgres). Same contract as the local
 * implementation; swapped in by the factory when the env vars are present.
 */
export class SupabaseRegistryStore implements RegistryStore {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<RegistryRow[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return (data ?? []).map((row) => dbToRow(row as RegistryRowDb));
  }

  async add(row: RegistryRow): Promise<void> {
    const { error } = await this.client.from(TABLE).insert(rowToDb(row));
    if (error) throw new Error(`Supabase add failed: ${error.message}`);
  }

  async update(code: string, fields: EditableFields): Promise<void> {
    const { error } = await this.client.from(TABLE).update(editableToDb(fields)).eq("code", code);
    if (error) throw new Error(`Supabase update failed: ${error.message}`);
  }

  async remove(code: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("code", code);
    if (error) throw new Error(`Supabase remove failed: ${error.message}`);
  }

  async existingCodes(): Promise<string[]> {
    const { data, error } = await this.client.from(TABLE).select("code");
    if (error) throw new Error(`Supabase existingCodes failed: ${error.message}`);
    return (data ?? []).map((row) => (row as { code: string }).code);
  }
}
