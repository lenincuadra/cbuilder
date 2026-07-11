import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeneralNotesStore } from "../../core/notes/types";

// Single-row table: the general notes are one markdown document, kept in the row
// with id = 1 (enforced by a check constraint in the schema).
const TABLE = "general_notes";
const SINGLETON_ID = 1;

/**
 * GeneralNotesStore backed by Supabase. Same contract as the file store; swapped
 * in by the server factory when the env vars are present.
 */
export class SupabaseGeneralNotesStore implements GeneralNotesStore {
  constructor(private readonly client: SupabaseClient) {}

  async get(): Promise<string> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("notes")
      .eq("id", SINGLETON_ID)
      .maybeSingle();
    if (error) throw new Error(`Supabase notes get failed: ${error.message}`);
    return (data?.notes as string | undefined) ?? "";
  }

  async set(notes: string): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .upsert(
        { id: SINGLETON_ID, notes, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw new Error(`Supabase notes set failed: ${error.message}`);
  }
}
