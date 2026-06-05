-- Terra Pride Photo Vote — Database schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- Auth model: we do NOT use Supabase Auth. Identity is email + custom OTP.
-- All DB access happens server-side with the service_role key, which
-- bypasses RLS. We still enable RLS on every table and add NO policies,
-- so the anon/authenticated roles get zero direct access. Defense in depth.

create extension if not exists "pgcrypto";

-- ── users ──────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- ── whitelist_emails ───────────────────────────────────────────
create table if not exists public.whitelist_emails (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists idx_whitelist_email on public.whitelist_emails (email);

-- ── otp_codes ──────────────────────────────────────────────────
create table if not exists public.otp_codes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  code_hash  text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_otp_email on public.otp_codes (email);
create index if not exists idx_otp_expires on public.otp_codes (expires_at);

-- ── photos ─────────────────────────────────────────────────────
create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  image_url     text not null,
  image_path    text not null,             -- storage object path, for deletion/migration
  thumbnail_url text,
  caption       text not null,
  is_deleted    boolean not null default false,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_photos_owner on public.photos (owner_user_id);
create index if not exists idx_photos_deleted on public.photos (is_deleted);
create index if not exists idx_photos_created on public.photos (created_at);

-- ── votes ──────────────────────────────────────────────────────
create table if not exists public.votes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  photo_id   uuid not null references public.photos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, photo_id)            -- one vote per (user, photo)
);
create index if not exists idx_votes_photo on public.votes (photo_id);
create index if not exists idx_votes_user on public.votes (user_id);

-- ── app_settings (single row, id = 1) ──────────────────────────
create table if not exists public.app_settings (
  id                  smallint primary key default 1,
  upload_open         boolean not null default false,
  voting_open         boolean not null default false,
  reveal_results_open boolean not null default false,
  updated_at          timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
insert into public.app_settings (id) values (1)
  on conflict (id) do nothing;

-- ── updated_at trigger for photos ──────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_photos_updated on public.photos;
create trigger trg_photos_updated
  before update on public.photos
  for each row execute function public.touch_updated_at();

-- ── Lock down: enable RLS, add no policies (service_role bypasses) ─
alter table public.users           enable row level security;
alter table public.whitelist_emails enable row level security;
alter table public.otp_codes       enable row level security;
alter table public.photos          enable row level security;
alter table public.votes           enable row level security;
alter table public.app_settings    enable row level security;

-- ── Storage bucket ─────────────────────────────────────────────
-- Create a PUBLIC bucket named "photos" (Dashboard → Storage → New bucket,
-- toggle "Public bucket" ON). Public read lets the gallery load images via
-- public URLs; uploads/deletes go through the server with the service role.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
