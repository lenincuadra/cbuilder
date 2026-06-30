import { createClient } from "@supabase/supabase-js";
import type { RegistryStore } from "@/core/registry/types";
import { ApiRegistryStore } from "./apiStore";
import { SupabaseRegistryStore } from "./supabaseStore";

let store: RegistryStore | null = null;

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
