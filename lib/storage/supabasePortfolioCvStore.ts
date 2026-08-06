import type { SupabaseClient } from "@supabase/supabase-js";
import type { Language } from "../../core/types";
import type { PortfolioCvState, PortfolioCvStore } from "../../core/portfolioCv/types";

const TABLE = "portfolio_cv";

interface PortfolioCvDb {
  language: string;
  version: number;
  published_at: string | null;
}

/**
 * PortfolioCvStore backed by Supabase — one row per language. Same contract as
 * the file store; swapped in by the server factory when the env vars are present.
 */
export class SupabasePortfolioCvStore implements PortfolioCvStore {
  constructor(private readonly client: SupabaseClient) {}

  async get(): Promise<PortfolioCvState> {
    const { data, error } = await this.client.from(TABLE).select("*");
    if (error) throw new Error(`Supabase portfolio-cv get failed: ${error.message}`);
    const state: PortfolioCvState = {};
    for (const row of data ?? []) {
      const db = row as PortfolioCvDb;
      if (db.language === "EN" || db.language === "ES") {
        state[db.language as Language] = {
          version: db.version,
          publishedAt: db.published_at ?? new Date(0).toISOString(),
        };
      }
    }
    return state;
  }

  async setPublished(language: Language, version: number): Promise<void> {
    const { error } = await this.client.from(TABLE).upsert(
      { language, version, published_at: new Date().toISOString() },
      { onConflict: "language" },
    );
    if (error) throw new Error(`Supabase portfolio-cv set failed: ${error.message}`);
  }
}
