import { createClient } from "@supabase/supabase-js";
import type { GeneralNotesStore } from "@/core/notes/types";
import type { RegistryStore } from "@/core/registry/types";
import { ApiGeneralNotesStore } from "./apiNotesStore";
import { ApiRegistryStore } from "./apiStore";
import { SupabaseRegistryStore } from "./supabaseStore";

let store: RegistryStore | null = null;
let notesStore: GeneralNotesStore | null = null;

/**
 * Single entry point to the registry store. Swap the implementation here
 * without touching core/ or ui/.
 *
 * - If the Supabase env vars are set, use the durable Supabase store.
 * - Otherwise use the local file store (via API routes): a JSON file on disk,
 *   shared across all browsers on this machine. Works while running the app
 *   locally; on Vercel use Supabase.
 *
 * (LocalStorageRegistryStore still exists in this folder as an alternative
 * implementation, but is no longer the default — it was per-browser.)
 */
export function getRegistryStore(): RegistryStore {
  if (store) return store;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    store = new SupabaseRegistryStore(createClient(url, anonKey));
    return store;
  }

  store = new ApiRegistryStore();
  return store;
}

/**
 * Single entry point to the general-notes store. Same shape as
 * getRegistryStore: for now always the local file/API path. A Supabase-backed
 * notes store would slot in here later (mirroring SupabaseRegistryStore) once
 * there's a table for it — the UI/core don't change.
 */
export function getGeneralNotesStore(): GeneralNotesStore {
  if (notesStore) return notesStore;
  notesStore = new ApiGeneralNotesStore();
  return notesStore;
}
