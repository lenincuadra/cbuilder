# Supabase setup (registry storage)

The registry lives behind the `RegistryStore` interface. When the Supabase env
vars are present the app uses `SupabaseRegistryStore`; otherwise it falls back to
per-browser `localStorage`.

## One-time setup

1. **Create a project** at https://supabase.com (free tier is enough).
2. **Create the table**: open the project's **SQL editor**, paste the contents of
   [`supabase/schema.sql`](../supabase/schema.sql), and run it.
3. **Get the credentials**: Project settings → API → copy the **Project URL** and
   the **anon public** key.
4. **Wire them locally**: copy `.env.local.example` to `.env.local` and fill both
   values. `.env.local` is gitignored.
5. `npm run dev` — the app now reads/writes the `registry` table. (Check the
   browser console: no localStorage warning means Supabase is active.)

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
