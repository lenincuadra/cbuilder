import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationStatus,
  Channel,
  EditableFields,
  RegistryRow,
  RegistryStore,
  StatusUpdate,
} from "../../core/registry/types";
import type { LanguageChoice } from "../../core/types";

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
  language: string | null;
  created_at: string | null;
  updates: StatusUpdate[] | null;
  archived: boolean | null;
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
    language: (db.language ?? undefined) as LanguageChoice | undefined,
    createdAt: db.created_at ?? undefined,
    updates: db.updates ?? undefined,
    archived: db.archived ?? undefined,
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
    language: row.language ?? null,
    created_at: row.createdAt ?? null,
    updates: row.updates ?? null,
    archived: row.archived ?? null,
  };
}

export function editableToDb(fields: EditableFields): Partial<RegistryRowDb> {
  const out: Partial<RegistryRowDb> = {};
  if ("notes" in fields) out.notes = fields.notes ?? null;
  if ("status" in fields) out.status = fields.status as string;
  if ("updates" in fields) out.updates = fields.updates ?? null;
  if ("archived" in fields) out.archived = fields.archived ?? null;
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

  async existingCodes(): Promise<string[]> {
    const { data, error } = await this.client.from(TABLE).select("code");
    if (error) throw new Error(`Supabase existingCodes failed: ${error.message}`);
    return (data ?? []).map((row) => (row as { code: string }).code);
  }
}
