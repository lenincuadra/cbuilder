import type { SupabaseClient } from "@supabase/supabase-js";
import type { StableLink, StableLinksStore } from "../../core/stableLinks/types";

const TABLE = "stable_links";

interface StableLinkDb {
  ref: string;
  name: string;
  created_at: string | null;
}

/**
 * StableLinksStore backed by Supabase. Same contract as the file store; swapped
 * in by the server factory when the env vars are present.
 */
export class SupabaseStableLinksStore implements StableLinksStore {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<StableLink[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Supabase stable-links list failed: ${error.message}`);
    return (data ?? []).map((row) => {
      const db = row as StableLinkDb;
      return { name: db.name, ref: db.ref, createdAt: db.created_at ?? undefined };
    });
  }

  async add(link: StableLink): Promise<void> {
    const { error } = await this.client.from(TABLE).insert({
      ref: link.ref,
      name: link.name,
      created_at: link.createdAt ?? new Date().toISOString(),
    });
    if (error) {
      // Unique violation on the ref → surface the same message as the file store.
      if (error.code === "23505") {
        throw new Error(`Ya existe un link estable con ref "${link.ref}".`);
      }
      throw new Error(`Supabase stable-links add failed: ${error.message}`);
    }
  }

  async update(ref: string, fields: Pick<StableLink, "name" | "ref">): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .update({ name: fields.name, ref: fields.ref })
      .eq("ref", ref);
    if (error) {
      if (error.code === "23505") {
        throw new Error(`Ya existe un link estable con ref "${fields.ref}".`);
      }
      throw new Error(`Supabase stable-links update failed: ${error.message}`);
    }
  }

  async remove(ref: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("ref", ref);
    if (error) throw new Error(`Supabase stable-links remove failed: ${error.message}`);
  }
}
