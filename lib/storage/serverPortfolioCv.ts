import type { PortfolioCvStore } from "@/core/portfolioCv/types";
import { filePortfolioCvStore } from "./filePortfolioCvStore";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { SupabasePortfolioCvStore } from "./supabasePortfolioCvStore";

let store: PortfolioCvStore | null = null;

/**
 * Server-side portfolio-CV store — used only by the API route, never the
 * browser. Supabase (service role key) on a deploy so the "published version"
 * survives redeploys, local JSON file otherwise. Mirrors getServerStableLinksStore.
 */
export function getServerPortfolioCvStore(): PortfolioCvStore {
  if (store) return store;
  const admin = getSupabaseAdmin();
  store = admin ? new SupabasePortfolioCvStore(admin) : filePortfolioCvStore;
  return store;
}
