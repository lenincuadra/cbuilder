-- cv-builder registry — run this in the Supabase SQL editor.
-- Columns map to RegistryRow (camelCase) via snake_case; the app converts them.

create table if not exists public.registry (
  code        text primary key,
  company     text not null,
  role        text not null default 'UX/UI Designer',
  channel     text,
  date        text not null,                 -- application date as "YYYY-MM-DD"
  notes       text,
  status      text not null default 'Activo' check (status in ('Activo', 'Rechazado')),
  who         text,
  job_url     text,
  language    text,
  created_at  timestamptz not null default now()
);

-- Newest applications first when listing.
create index if not exists registry_created_at_idx on public.registry (created_at desc);

-- Row Level Security.
alter table public.registry enable row level security;

-- DEV policy: any client holding the anon key can read/write the table.
-- This is fine for local/private use, but the anon key is shipped to the
-- browser, so a PUBLIC deployment would expose the registry to anyone.
-- Before deploying publicly, drop this policy and gate access behind
-- Supabase Auth (e.g. `to authenticated` + a user-id check).
drop policy if exists "anon full access (dev)" on public.registry;
create policy "anon full access (dev)"
  on public.registry
  for all
  to anon
  using (true)
  with check (true);
