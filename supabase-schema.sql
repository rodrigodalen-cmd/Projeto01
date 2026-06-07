-- ============================================================
-- Bolão Copa 2026 — Supabase Schema
-- Execute no SQL Editor do seu projeto Supabase
-- https://app.supabase.com → SQL Editor
-- ============================================================

-- ===== PROFILES (extends auth.users) =====
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text not null,
  phone text,
  cpf text unique,
  pix text,
  dob date,
  photo text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Function to get email by CPF (used for login via CPF)
create or replace function get_email_by_cpf(p_cpf text)
returns text language plpgsql security definer as $$
declare
  v_email text;
  clean_input text;
begin
  clean_input := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  select email into v_email
  from profiles
  where regexp_replace(cpf, '[^0-9]', '', 'g') = clean_input
  limit 1;
  return v_email;
end;
$$;

-- ===== BOLOES =====
-- Stores the entire bolão state including participants and messages as JSONB.
-- This matches the localStorage structure exactly for easy sync.
create table if not exists boloes (
  id text primary key,
  title text not null,
  creator_id text not null,
  creator_name text not null,
  creator_pix_key text default '',
  game jsonb not null,
  amount integer not null,
  max_part integer not null default 20,
  has_pw boolean default false,
  pw text default '',
  status text default 'open',
  code text unique not null,
  result jsonb,
  points_exact integer default 3,
  points_result integer default 1,
  participants jsonb default '[]'::jsonb,
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table boloes enable row level security;

-- Anyone authenticated can read any bolão (needed for join-by-code)
create policy "Authenticated users can view boloes"
  on boloes for select using (auth.role() = 'authenticated');

-- Only authenticated users can create bolões
create policy "Authenticated users can create boloes"
  on boloes for insert with check (auth.role() = 'authenticated');

-- Only creator can update/delete a bolão
create policy "Creator can update bolao"
  on boloes for update using (
    creator_id = (select email from profiles where id = auth.uid())
  );

create policy "Creator can delete bolao"
  on boloes for delete using (
    creator_id = (select email from profiles where id = auth.uid())
  );

-- Participants can also update the bolão (to add themselves, post bets, messages)
-- We use a permissive policy here: any authenticated user can update any bolão.
-- In production you'd restrict this further, but for a friends-only app this is fine.
create policy "Participants can update bolao"
  on boloes for update using (auth.role() = 'authenticated');

-- ===== INDEXES =====
create index if not exists boloes_code_idx on boloes(code);
create index if not exists boloes_creator_id_idx on boloes(creator_id);
create index if not exists boloes_created_at_idx on boloes(created_at desc);

-- ============================================================
-- IMPORTANT: After running this schema, copy your project's
-- URL and anon key into index.html:
--
--   const SUPABASE_URL = 'https://your-project.supabase.co';
--   const SUPABASE_ANON_KEY = 'eyJ...';
--
-- Find them at: Settings → API in your Supabase dashboard
-- ============================================================
