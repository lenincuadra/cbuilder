import type { CoverLetterTemplatesStore } from "@/core/coverLetter/types";
import { fileCoverLetterTemplatesStore } from "./fileCoverLetterTemplatesStore";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { SupabaseCoverLetterTemplatesStore } from "./supabaseCoverLetterTemplatesStore";

let store: CoverLetterTemplatesStore | null = null;

/**
 * Server-side cover-letter-templates store — used only by the API routes, never
 * the browser. Supabase (service role key) on a deploy, local JSON file
 * otherwise. Mirrors getServerRegistryStore. See docs/deploy.md.
 */
export function getServerCoverLetterTemplatesStore(): CoverLetterTemplatesStore {
  if (store) return store;
  const admin = getSupabaseAdmin();
  store = admin ? new SupabaseCoverLetterTemplatesStore(admin) : fileCoverLetterTemplatesStore;
  return store;
}
