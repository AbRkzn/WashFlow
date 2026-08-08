-- WashFlow remote schema (Supabase/Postgres).
-- Mirrors the local Drizzle schema where applicable; adds auth-side objects for P2.
-- Roles live in auth.users.app_metadata.role (source of truth for the app),
-- mirrored into public.profiles for SQL-side RLS.
-- The provision-user Edge Function (service role) keeps both in sync.
--
-- This script is idempotent: it can be re-run safely (useful when applying
-- schema changes to an existing project).

-- Postgres has no `create type if not exists`, so swallow the duplicate-object
-- error when the enum already exists.
do $$
begin
  create type public.app_role as enum ('admin', 'manager', 'cashier', 'washer');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'washer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row when a user is created through any path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'washer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Profiles: users read their own row; admins read all. Writes happen via
-- the service role (provisioning Edge Function) or the profile owner.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);
