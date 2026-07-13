import type { ScreeningStore } from "@/core/screening/types";
import { fileScreeningStore } from "./fileScreeningStore";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { SupabaseScreeningStore } from "./supabaseScreeningStore";

let store: ScreeningStore | null = null;

/**
 * Server-side screening-questions store — used only by the API routes. Same
 * factory shape as the registry: Supabase with the service role key when
 * configured (deploy), local JSON file otherwise. See docs/deploy.md.
 */
export function getServerScreeningStore(): ScreeningStore {
  if (store) return store;
  const admin = getSupabaseAdmin();
  store = admin ? new SupabaseScreeningStore(admin) : fileScreeningStore;
  return store;
}
