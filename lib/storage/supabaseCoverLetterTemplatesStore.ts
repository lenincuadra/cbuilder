import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CoverLetterBodies,
  CoverLetterTemplate,
  CoverLetterTemplatesStore,
  EditableTemplateFields,
} from "../../core/coverLetter/types";

const TABLE = "cover_letter_templates";

interface TemplateDb {
  id: string;
  name: string;
  bodies: CoverLetterBodies | null;
  created_at: string | null;
}

/**
 * CoverLetterTemplatesStore backed by Supabase. Same contract as the file
 * store; swapped in by the server factory when the env vars are present.
 */
export class SupabaseCoverLetterTemplatesStore implements CoverLetterTemplatesStore {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<CoverLetterTemplate[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Supabase cover-letter list failed: ${error.message}`);
    return (data ?? []).map((row) => {
      const db = row as TemplateDb;
      return {
        id: db.id,
        name: db.name,
        bodies: db.bodies ?? {},
        createdAt: db.created_at ?? undefined,
      };
    });
  }

  async add(template: CoverLetterTemplate): Promise<void> {
    const { error } = await this.client.from(TABLE).insert({
      id: template.id,
      name: template.name,
      bodies: template.bodies,
      created_at: template.createdAt ?? new Date().toISOString(),
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error(`Ya existe un template con id "${template.id}".`);
      }
      throw new Error(`Supabase cover-letter add failed: ${error.message}`);
    }
  }

  async update(id: string, fields: EditableTemplateFields): Promise<void> {
    const patch: Partial<TemplateDb> = {};
    if ("name" in fields) patch.name = fields.name;
    if ("bodies" in fields) patch.bodies = fields.bodies ?? {};
    const { error } = await this.client.from(TABLE).update(patch).eq("id", id);
    if (error) throw new Error(`Supabase cover-letter update failed: ${error.message}`);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(`Supabase cover-letter remove failed: ${error.message}`);
  }
}
