import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EditableScreeningFields,
  ScreeningQuestion,
  ScreeningStore,
} from "../../core/screening/types";

const TABLE = "screening_questions";

interface ScreeningDb {
  id: string;
  question: string;
  answer: string | null;
  codes: string[] | null;
  draft: boolean | null;
  created_at: string | null;
}

/**
 * ScreeningStore backed by Supabase. Same contract as the file store;
 * swapped in by the server factory when the env vars are present.
 */
export class SupabaseScreeningStore implements ScreeningStore {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<ScreeningQuestion[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Supabase screening list failed: ${error.message}`);
    return (data ?? []).map((row) => {
      const db = row as ScreeningDb;
      return {
        id: db.id,
        question: db.question,
        answer: db.answer ?? "",
        codes: db.codes ?? [],
        draft: db.draft ?? undefined,
        createdAt: db.created_at ?? undefined,
      };
    });
  }

  async add(entry: ScreeningQuestion): Promise<void> {
    const { error } = await this.client.from(TABLE).insert({
      id: entry.id,
      question: entry.question,
      answer: entry.answer,
      codes: entry.codes,
      draft: entry.draft ?? false,
      created_at: entry.createdAt ?? new Date().toISOString(),
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error(`Ya existe una pregunta con id "${entry.id}".`);
      }
      throw new Error(`Supabase screening add failed: ${error.message}`);
    }
  }

  async update(id: string, fields: EditableScreeningFields): Promise<void> {
    const patch: Partial<ScreeningDb> = {};
    if ("question" in fields) patch.question = fields.question;
    if ("answer" in fields) patch.answer = fields.answer ?? "";
    if ("codes" in fields) patch.codes = fields.codes ?? [];
    if ("draft" in fields) patch.draft = fields.draft ?? false;
    const { error } = await this.client.from(TABLE).update(patch).eq("id", id);
    if (error) throw new Error(`Supabase screening update failed: ${error.message}`);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(`Supabase screening remove failed: ${error.message}`);
  }
}
