import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Shared server-only Supabase client, built with the **service role key** (it
 * bypasses RLS and never reaches the browser). Returns `null` when the env vars
 * are absent, so each store's server factory falls back to its local file store.
 * Memoized: one client for the registry, notes and stable-links. See docs/deploy.md.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client =
    url && serviceKey
      ? createClient(url, serviceKey, { auth: { persistSession: false } })
      : null;
  return client;
}
