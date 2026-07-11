-- cv-builder registry — run this in the Supabase SQL editor.
-- Columns map to RegistryRow (camelCase) via snake_case; the app converts them.

create table if not exists public.registry (
  code        text primary key,
  company     text not null,
  role        text not null default 'UX/UI Designer',
  channel     text,
  email       text,                          -- required (app-side) when channel = 'Email'
  date        text not null,                 -- application date as "YYYY-MM-DD"
  notes       text,
  status      text not null default 'Activo' check (status in ('Activo', 'Rechazado')),
  who         text,
  job_url     text,
  language    text,
  focus       text,                          -- portfolio focus profile baked into the CV links
  zip_name    text,                          -- archived delivery zip file name (data/cvs/)
  drive_docs  jsonb,                         -- Google Doc URL per language {"EN": url, "ES": url}
  drive_folder text,                         -- Drive folder holding this application's Doc(s)
  links       jsonb,                         -- the 3 tracked links baked into the CV {portfolio, linkedin, github}
  created_at  timestamptz not null default now(),
  updates     jsonb not null default '[]'::jsonb,  -- follow-up timeline [{at, message}]
  archived    boolean not null default false
);

-- Newest applications first when listing.
create index if not exists registry_created_at_idx on public.registry (created_at desc);

-- Row Level Security ON, with NO policy → anon/authenticated are denied.
-- The app never touches this table from the browser: it goes through its own
-- server API routes, which use the SERVICE ROLE key (bypasses RLS, never shipped
-- to the client). So the registry stays private even though the project is public.
-- If a leftover "anon full access (dev)" policy exists from an earlier setup,
-- drop it so the anon key can't read/write the table.
alter table public.registry enable row level security;
drop policy if exists "anon full access (dev)" on public.registry;
