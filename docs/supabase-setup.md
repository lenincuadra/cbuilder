# Supabase (registry storage)

The registry lives behind the `RegistryStore` interface. It's accessed **only from
the server** (`getServerRegistryStore`): with the Supabase env vars set it uses
`SupabaseRegistryStore` with the **service role key**; without them it falls back to
the local file store (`data/registry.json`). The browser always goes through the
app's API routes, so the private registry is never exposed by a public key.

**For the full deploy walkthrough (Supabase + Vercel + auth), see
[`deploy.md`](deploy.md).** This file is just the Supabase table setup.

## Create the table

1. **Create a project** at https://supabase.com (free tier is enough).
2. **SQL editor** → paste and run [`supabase/schema.sql`](../supabase/schema.sql).
   It tracks `RegistryRow` (incl. `focus`, `zip_name`, `drive_docs`, `drive_folder`,
   `links`) and turns on RLS **with no policy** — anon is denied; only the service
   key (server-side) reaches the table. If you ran an older schema, add missing
   columns and drop the old dev policy:
   ```sql
   alter table public.registry
     add column if not exists focus text,
     add column if not exists zip_name text,
     add column if not exists drive_docs jsonb,
     add column if not exists drive_folder text,
     add column if not exists links jsonb;
   drop policy if exists "anon full access (dev)" on public.registry;
   ```
3. **Credentials**: Project settings → API → copy the **Project URL** and the
   **`service_role`** key (NOT the anon key). Put them in `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY` (see `.env.local.example`). ⚠️ The service key is a
   full secret — never ship it to the client or commit it.

> This covers the **registry** only. General notes and stable links are still
> file-based (no Supabase table yet); the Google Docs sink is independent
> (see [`gdocs-setup.md`](gdocs-setup.md)).

## Importing an existing registry

Bulk-load real history with the CSV from the app's **Exportar** button, or a
one-off insert — the schema maps 1:1 to `RegistryRow`.
