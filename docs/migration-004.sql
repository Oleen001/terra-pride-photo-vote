-- Terra Pride - migration 004: reusable magic login links + auth audit log
-- Run in the Supabase SQL editor after migration-003.sql.

-- Personal magic-link tokens. Store only SHA-256 hashes of the email token;
-- plaintext tokens are only used while preparing outbound emails.
create table if not exists public.magic_login_tokens (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  sent_at      timestamptz,
  last_used_at timestamptz,
  use_count    integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_magic_login_tokens_email
  on public.magic_login_tokens (email);
create index if not exists idx_magic_login_tokens_expires
  on public.magic_login_tokens (expires_at);
create index if not exists idx_magic_login_tokens_active_email
  on public.magic_login_tokens (email, expires_at desc)
  where revoked_at is null;

-- Auth events are intentionally code/token-free. They are for troubleshooting
-- delivery, link usage, and successful login flows without exposing secrets.
create table if not exists public.login_audit_events (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  event      text not null,
  status     text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_login_audit_events_created
  on public.login_audit_events (created_at desc);
create index if not exists idx_login_audit_events_email_created
  on public.login_audit_events (email, created_at desc);
create index if not exists idx_login_audit_events_event_created
  on public.login_audit_events (event, created_at desc);

drop trigger if exists trg_magic_login_tokens_updated on public.magic_login_tokens;
create trigger trg_magic_login_tokens_updated
  before update on public.magic_login_tokens
  for each row execute function public.touch_updated_at();

alter table public.magic_login_tokens enable row level security;
alter table public.login_audit_events enable row level security;
