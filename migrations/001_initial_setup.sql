-- =========================================================
-- Arkanalytics: Initial Database Setup
-- =========================================================
-- Fresh start: Create users table, extensions, triggers

-- =========================================================
-- 1. EXTENSIONS
-- =========================================================

create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- =========================================================
-- 2. HELPER FUNCTIONS
-- =========================================================

-- Updated at timestamp trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 3. USERS TABLE (extends auth.users)
-- =========================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  arka_id text not null unique check (char_length(btrim(arka_id)) >= 3),
  full_name text,
  email citext,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_arka_id on public.users(arka_id);
create index if not exists idx_users_email on public.users(email);

-- Auto-update updated_at
drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

-- =========================================================
-- 4. AUTH TRIGGER: Auto-create user record
-- =========================================================

-- When new user signs up via Supabase Auth, auto-create public.users record
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_clean_name text;
  v_name_parts text[];
  v_slug text;
  v_arka_id text;
  v_try int;
begin
  v_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_clean_name := lower(regexp_replace(coalesce(v_full_name, 'user'), '[^a-zA-Z0-9 ]', ' ', 'g'));
  v_clean_name := btrim(regexp_replace(v_clean_name, '\s+', ' ', 'g'));
  v_name_parts := regexp_split_to_array(v_clean_name, '\s+');
  v_slug := array_to_string(v_name_parts[1:3], '-');

  if v_slug is null or v_slug = '' then
    v_slug := 'user';
  end if;

  for v_try in 1..120 loop
    v_arka_id := 'ark-' || v_slug || '-' || lpad((floor(random() * 100)::int)::text, 2, '0');

    begin
      insert into public.users (id, arka_id, full_name, email, avatar_url)
      values (
        new.id,
        v_arka_id,
        coalesce(v_full_name, ''),
        new.email,
        new.raw_user_meta_data ->> 'avatar_url'
      );
      return new;
    exception
      when unique_violation then
        -- Retry with a different random suffix if arka_id collides.
        null;
    end;
  end loop;

  raise exception 'Failed to generate unique arka_id after % attempts', 120;
end;
$$;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- =========================================================
-- 5. ROW LEVEL SECURITY (RLS) for users table
-- =========================================================

alter table public.users enable row level security;

-- Users dapat see own profile + workspace members (via workspace_members table)
drop policy if exists users_select_own on public.users;
create policy users_select_own
on public.users
for select
to authenticated
using (id = auth.uid());

-- Users dapat update own profile
drop policy if exists users_update_own on public.users;
create policy users_update_own
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Service role can view all (untuk admin queries)
drop policy if exists users_select_service on public.users;
create policy users_select_service
on public.users
for select
to service_role
using (true);

-- =========================================================
-- Notes
-- =========================================================
-- 1. Public.users extends auth.users dengan arka_id dan metadata
-- 2. Trigger auto-creates user record saat signup
-- 3. arka_id format = ark-(max 3 kata nama)-NN
-- 4. RLS: users hanya bisa lihat own profile (profile workspace members lihat via workspace_members)
-- 5. Ready untuk 002_create_workspace_and_members_tables.sql
