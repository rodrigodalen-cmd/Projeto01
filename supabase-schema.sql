-- ============================================================
-- Bolão Copa 2026 — Supabase Schema v2
-- Execute no SQL Editor do seu projeto Supabase
-- https://app.supabase.com → SQL Editor → New query → Run
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

-- Drop old policies to avoid conflicts on re-run
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Insert is handled by the create_profile function below (SECURITY DEFINER)
-- so no direct insert policy needed from clients.

-- ===== FUNCTION: create_profile =====
-- SECURITY DEFINER: runs as DB owner, bypasses RLS.
-- Works even when email confirmation is enabled (no session yet).
create or replace function create_profile(
  p_id    uuid,
  p_email text,
  p_name  text,
  p_phone text,
  p_cpf   text,
  p_pix   text,
  p_dob   text
) returns void language plpgsql security definer as $$
begin
  insert into profiles (id, email, name, phone, cpf, pix, dob)
  values (
    p_id, p_email, p_name, p_phone, p_cpf, p_pix,
    case when p_dob = '' then null else p_dob::date end
  )
  on conflict (id) do nothing;
end;
$$;

-- Grant execute to anon and authenticated roles
grant execute on function create_profile to anon, authenticated;

-- ===== FUNCTION: get_email_by_cpf =====
-- Used for login via CPF.
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

grant execute on function get_email_by_cpf to anon, authenticated;

-- ===== BOLOES =====
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

drop policy if exists "Authenticated users can view boloes" on boloes;
drop policy if exists "Authenticated users can create boloes" on boloes;
drop policy if exists "Creator can update bolao" on boloes;
drop policy if exists "Creator can delete bolao" on boloes;
drop policy if exists "Participants can update bolao" on boloes;

create policy "Authenticated users can view boloes"
  on boloes for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create boloes"
  on boloes for insert with check (auth.role() = 'authenticated');

create policy "Creator can update bolao"
  on boloes for update using (
    creator_id = (select email from profiles where id = auth.uid())
  );

create policy "Creator can delete bolao"
  on boloes for delete using (
    creator_id = (select email from profiles where id = auth.uid())
  );

create policy "Participants can update bolao"
  on boloes for update using (auth.role() = 'authenticated');

-- ===== INDEXES =====
create index if not exists boloes_code_idx on boloes(code);
create index if not exists boloes_creator_id_idx on boloes(creator_id);
create index if not exists boloes_created_at_idx on boloes(created_at desc);
