-- cv-builder — run this in the Supabase SQL editor (prod after merges that touch schema).
-- schema_version: 3  (registry + notes + stable_links + cover_letter_templates
--                     + screening_questions + cvs bucket + cv_pending/delivery_files)
-- Bump schema_version when this file changes; see docs/versioning.md §3.
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
  cover_letter jsonb,                        -- cover letter sent {templateId, templateName, bodies: {EN?, ES?}}
  created_at  timestamptz not null default now(),
  updates     jsonb not null default '[]'::jsonb,  -- follow-up timeline [{at, message}]
  archived    boolean not null default false,
  cv_pending  boolean not null default false,      -- process registered, CV not generated yet
  delivery_files jsonb                             -- archived delivered files ["<folder>/<file>.docx", ...]
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


-- General notes: a single free-text markdown document about the job search as a
-- whole (not tied to any application). One row, pinned to id = 1.
create table if not exists public.general_notes (
  id         smallint primary key default 1 check (id = 1),
  notes      text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.general_notes enable row level security;

-- Stable links: tracking refs for permanent touchpoints (LinkedIn, Behance…),
-- not tied to a single application. One row per touchpoint, keyed by ref.
create table if not exists public.stable_links (
  ref        text primary key,
  name       text not null,
  created_at timestamptz not null default now()
);
create index if not exists stable_links_created_at_idx on public.stable_links (created_at);
alter table public.stable_links enable row level security;

-- Cover letter templates: reusable markdown per application type. Bodies keyed
-- by language {"EN": md, "ES": md}; {company}/{role}/{who} variables resolve in
-- the wizard at generation time.
create table if not exists public.cover_letter_templates (
  id         text primary key,
  name       text not null,
  bodies     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cover_letter_templates_created_at_idx
  on public.cover_letter_templates (created_at);
alter table public.cover_letter_templates enable row level security;

-- Screening questions bank: the unique pre-screening questions applications
-- ask and the answers given, for fast reuse. `codes` lists the tracking codes
-- of the applications where each question was asked.
create table if not exists public.screening_questions (
  id         text primary key,
  question   text not null,
  answer     text not null default '',
  codes      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists screening_questions_created_at_idx
  on public.screening_questions (created_at);
alter table public.screening_questions enable row level security;

-- All tables: same privacy model as registry — RLS on, NO policy, reached only
-- via the service role key from the server.

-- CV archive: private Storage bucket holding the delivered .docx files
-- (<folder>/<file>.docx). No public URLs; the app reads/writes it with the
-- service role key through its own API routes (POST/GET /api/cvs).
insert into storage.buckets (id, name, public)
  values ('cvs', 'cvs', false)
  on conflict (id) do nothing;

-- Migrations for a database created before these fields existed (safe to re-run):
--   alter table public.registry add column if not exists cover_letter jsonb;
--   alter table public.registry add column if not exists cv_pending boolean not null default false;
--   alter table public.registry add column if not exists delivery_files jsonb;
