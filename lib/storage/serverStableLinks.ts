import type { StableLinksStore } from "@/core/stableLinks/types";
import { fileStableLinksStore } from "./fileStableLinksStore";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { SupabaseStableLinksStore } from "./supabaseStableLinksStore";

let store: StableLinksStore | null = null;

/**
 * Server-side stable-links store — used only by the API routes, never the
 * browser. Supabase (service role key) on a deploy, local JSON file otherwise.
 * Mirrors getServerRegistryStore. See docs/deploy.md.
 */
export function getServerStableLinksStore(): StableLinksStore {
  if (store) return store;
  const admin = getSupabaseAdmin();
  store = admin ? new SupabaseStableLinksStore(admin) : fileStableLinksStore;
  return store;
}
