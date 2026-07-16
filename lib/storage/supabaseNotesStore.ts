import type { SupabaseClient } from "@supabase/supabase-js";
import type { EditableGeneralNoteFields, GeneralNote, GeneralNotesStore } from "../../core/notes/types";

const TABLE = "general_notes_entries";

interface GeneralNoteDb {
  id: string;
  title: string;
  body: string | null;
  created_at: string | null;
}

/**
 * GeneralNotesStore backed by Supabase. Same contract as the file store;
 * swapped in by the server factory when the env vars are present.
 */
export class SupabaseGeneralNotesStore implements GeneralNotesStore {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<GeneralNote[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Supabase notes list failed: ${error.message}`);
    return (data ?? []).map((row) => {
      const db = row as GeneralNoteDb;
      return {
        id: db.id,
        title: db.title,
        body: db.body ?? "",
        createdAt: db.created_at ?? undefined,
      };
    });
  }

  async add(note: GeneralNote): Promise<void> {
    const { error } = await this.client.from(TABLE).insert({
      id: note.id,
      title: note.title,
      body: note.body,
      created_at: note.createdAt ?? new Date().toISOString(),
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error(`Ya existe una nota con id "${note.id}".`);
      }
      throw new Error(`Supabase notes add failed: ${error.message}`);
    }
  }

  async update(id: string, fields: EditableGeneralNoteFields): Promise<void> {
    const patch: Partial<GeneralNoteDb> = {};
    if ("title" in fields) patch.title = fields.title;
    if ("body" in fields) patch.body = fields.body ?? "";
    const { error } = await this.client.from(TABLE).update(patch).eq("id", id);
    if (error) throw new Error(`Supabase notes update failed: ${error.message}`);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(`Supabase notes remove failed: ${error.message}`);
  }
}
