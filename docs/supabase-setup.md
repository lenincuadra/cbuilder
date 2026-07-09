# Supabase setup (registry storage)

The registry lives behind the `RegistryStore` interface. When the Supabase env
vars are present the app uses `SupabaseRegistryStore`; otherwise it falls back to
the **local file store** (`data/registry.json` on disk, via API routes) — durable
and shared across browsers on the same machine. Supabase is for deploy / sharing.
See [`architecture.md`](architecture.md) for the full storage picture.

## One-time setup

1. **Create a project** at https://supabase.com (free tier is enough).
2. **Create the table**: open the project's **SQL editor**, paste the contents of
   [`supabase/schema.sql`](../supabase/schema.sql), and run it. The schema tracks
   `RegistryRow` — it already includes the newer columns (`focus`, `zip_name`,
   `drive_docs`). If you ran an older schema, add the missing ones:
   `alter table public.registry add column if not exists focus text, add column
   if not exists zip_name text, add column if not exists drive_docs jsonb;`
3. **Get the credentials**: Project settings → API → copy the **Project URL** and
   the **anon public** key.
4. **Wire them locally**: copy `.env.local.example` to `.env.local` and fill both
   values. `.env.local` is gitignored.
5. `npm run dev` — the app now reads/writes the `registry` table instead of the
   local file store.

> Note: this covers the **registry** only. The general-notes store is still
> file-based (no Supabase table yet), and the Google Docs sink is independent
> (see [`gdocs-setup.md`](gdocs-setup.md)).

## On Vercel

Add the same two vars in **Project → Settings → Environment Variables**:
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Redeploy.

## Security note (read before deploying publicly)

`NEXT_PUBLIC_*` vars are shipped to the browser, so the anon key is public. The
dev RLS policy in `schema.sql` lets anyone with that key read/write the registry.
That is fine for local/private use, but **before a public deployment** replace the
policy with an auth-gated one (Supabase Auth + `to authenticated`), so only you
can see who you applied to.

## Importing an existing registry

The legacy CLI registry (`tracking-registry.md`) currently holds only a test row.
If you have real history to bulk-load, share the file and we'll add an importer
that parses it into rows and inserts them.
