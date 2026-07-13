import { FileCvArchiveStore, type CvArchiveStore } from "./cvArchive";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { SupabaseCvArchiveStore } from "./supabaseCvArchiveStore";

let store: CvArchiveStore | null | undefined;

/**
 * Server-side CV archive — used only by the API routes. Supabase Storage when
 * the service key is configured (durable on a deploy); locally the file store
 * (data/cvs/). Returns `null` on a deploy without Supabase: the filesystem
 * there is ephemeral, so archiving would silently lie — the routes answer 501
 * ("feature off here"), same contract as the gdocs sink.
 */
export function getServerCvArchiveStore(): CvArchiveStore | null {
  if (store !== undefined) return store;
  const admin = getSupabaseAdmin();
  store = admin
    ? new SupabaseCvArchiveStore(admin)
    : process.env.VERCEL
      ? null
      : new FileCvArchiveStore();
  return store;
}
