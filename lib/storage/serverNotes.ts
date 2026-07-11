import type { GeneralNotesStore } from "@/core/notes/types";
import { fileNotesStore } from "./fileNotesStore";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { SupabaseGeneralNotesStore } from "./supabaseNotesStore";

let store: GeneralNotesStore | null = null;

/**
 * Server-side general-notes store — used only by the API route, never the
 * browser. Supabase (service role key) on a deploy, local JSON file otherwise.
 * Mirrors getServerRegistryStore. See docs/deploy.md.
 */
export function getServerNotesStore(): GeneralNotesStore {
  if (store) return store;
  const admin = getSupabaseAdmin();
  store = admin ? new SupabaseGeneralNotesStore(admin) : fileNotesStore;
  return store;
}
