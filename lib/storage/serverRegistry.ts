import { createClient } from "@supabase/supabase-js";
import type { RegistryStore } from "@/core/registry/types";
import { fileStore } from "./fileStore";
import { SupabaseRegistryStore } from "./supabaseStore";

let store: RegistryStore | null = null;

/**
 * Server-side registry store — used only by the API routes, never the browser.
 * On a deploy (Vercel) it uses Supabase with the **service role key**, which
 * bypasses RLS and never reaches the client; locally (no Supabase env) it falls
 * back to the JSON file store. The client always talks to `/api/registry`, so
 * the durable store stays behind the server and the registry (private) is never
 * exposed by a public anon key. See docs/deploy.md.
 */
export function getServerRegistryStore(): RegistryStore {
  if (store) return store;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    store = new SupabaseRegistryStore(
      createClient(url, serviceKey, { auth: { persistSession: false } }),
    );
    return store;
  }

  store = fileStore;
  return store;
}
