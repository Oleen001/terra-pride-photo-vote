-- Terra Pride — migration 003: admin-managed typewriter phrases
-- Run in the Supabase SQL editor after migration-002.sql.
--
-- Same model as the rest of the schema: all access is server-side via the
-- service_role key. RLS is enabled with NO policies so anon/authenticated
-- roles get zero direct access. Defense in depth.

create table if not exists public.typewriter_phrases (
  id         uuid primary key default gen_random_uuid(),
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_typewriter_phrases_created
  on public.typewriter_phrases (created_at desc);

alter table public.typewriter_phrases enable row level security;

-- Seed with the original hardcoded phrases from force-gallery.tsx.
insert into public.typewriter_phrases (text) values
  ('Capture the moment'),
  ('Show your colors'),
  ('Best shot wins'),
  ('Vote your favorite'),
  ('Snap and share'),
  ('Love is loud'),
  ('Be seen'),
  ('Proud and loud'),
  ('Strike a pose'),
  ('Frame the joy'),
  ('Make it count'),
  ('Pick a winner'),
  ('Tap your fave'),
  ('Spread the love'),
  ('Shine on'),
  ('Live in color'),
  ('Own your shine'),
  ('Smile bright'),
  ('Catch the light'),
  ('Stay golden'),
  ('Color the world'),
  ('Find the spark'),
  ('Chase the light'),
  ('Hold the pose'),
  ('Cheer loud');
