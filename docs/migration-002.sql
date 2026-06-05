-- Terra Pride — migration 002: OTP brute-force cap + email send log
-- Run in the Supabase SQL editor after the initial schema.sql.

-- 1. OTP failed-attempt counter (lock an OTP after too many wrong tries).
alter table public.otp_codes
  add column if not exists failed_attempts integer not null default 0;

-- 2. Email send log — audit trail of every OTP delivery attempt.
create table if not exists public.email_logs (
  id         uuid primary key default gen_random_uuid(),
  recipient  text not null,
  kind       text not null default 'otp',
  status     text not null,            -- 'sent' | 'failed'
  provider   text,                     -- sender account used
  error      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_logs_recipient on public.email_logs (recipient);
create index if not exists idx_email_logs_created on public.email_logs (created_at desc);
create index if not exists idx_email_logs_provider_created on public.email_logs (provider, created_at desc);

alter table public.email_logs enable row level security;
