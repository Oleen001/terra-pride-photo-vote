-- Terra Pride - migration 005: Quiz Live backend tables and RPCs
-- Run in the Supabase SQL editor after migration-004.sql.
--
-- Access model matches the existing app: all app access is server-side through
-- the service_role key. RLS is enabled with no anon/authenticated policies.
-- This file is a draft migration only; do not run it against production until
-- the product flow is confirmed.

create extension if not exists "pgcrypto";

alter table public.app_settings
  add column if not exists quiz_open boolean not null default false;

do $$
begin
  create type public.quiz_run_mode as enum ('live', 'practice');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.quiz_run_state as enum (
    'closed',
    'lobby',
    'question_active',
    'paused',
    'question_ended',
    'ended'
  );
exception when duplicate_object then null;
end $$;

-- Many quiz sets can exist, but only one is marked active at a time.
create table if not exists public.quiz_sets (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  title                  text not null,
  description            text,
  is_active              boolean not null default false,
  created_by_admin_email text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint quiz_sets_slug_nonempty check (length(trim(slug)) > 0),
  constraint quiz_sets_title_nonempty check (length(trim(title)) > 0)
);
create unique index if not exists idx_quiz_sets_one_active
  on public.quiz_sets ((true))
  where is_active;
create index if not exists idx_quiz_sets_created
  on public.quiz_sets (created_at desc);

create table if not exists public.quiz_questions (
  id                 uuid primary key default gen_random_uuid(),
  quiz_set_id        uuid not null references public.quiz_sets (id) on delete cascade,
  position           integer not null,
  prompt             text not null,
  explanation        text,
  time_limit_seconds integer not null default 30,
  points             integer not null default 1000,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (quiz_set_id, position),
  unique (id, quiz_set_id),
  constraint quiz_questions_position_positive check (position > 0),
  constraint quiz_questions_prompt_nonempty check (length(trim(prompt)) > 0),
  constraint quiz_questions_time_limit check (time_limit_seconds between 5 and 600),
  constraint quiz_questions_points check (points between 0 and 10000)
);
create index if not exists idx_quiz_questions_set_position
  on public.quiz_questions (quiz_set_id, position);

create table if not exists public.quiz_choices (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  position    integer not null,
  label       text not null,
  is_correct  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (question_id, position),
  unique (id, question_id),
  constraint quiz_choices_position_positive check (position > 0),
  constraint quiz_choices_label_nonempty check (length(trim(label)) > 0)
);
create unique index if not exists idx_quiz_choices_one_correct
  on public.quiz_choices (question_id)
  where is_correct;
create index if not exists idx_quiz_choices_question_position
  on public.quiz_choices (question_id, position);

create table if not exists public.quiz_runs (
  id                          uuid primary key default gen_random_uuid(),
  quiz_set_id                 uuid not null references public.quiz_sets (id) on delete restrict,
  mode                        public.quiz_run_mode not null,
  state                       public.quiz_run_state not null default 'closed',
  join_code                   text unique,
  current_question_id         uuid references public.quiz_questions (id) on delete restrict,
  current_question_started_at timestamptz,
  current_question_ends_at    timestamptz,
  answer_revealed_at          timestamptz,
  hide_leaderboard            boolean not null default false,
  paused_at                   timestamptz,
  state_before_pause          public.quiz_run_state,
  created_by_admin_email      text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  ended_at                    timestamptz,
  constraint quiz_runs_current_question_in_set
    foreign key (current_question_id, quiz_set_id)
    references public.quiz_questions (id, quiz_set_id)
    on delete restrict,
  constraint quiz_runs_join_code_nonempty check (join_code is null or length(trim(join_code)) > 0),
  constraint quiz_runs_question_timer_order check (
    current_question_started_at is null
    or current_question_ends_at is null
    or current_question_ends_at > current_question_started_at
  ),
  constraint quiz_runs_pause_shape check (
    (state = 'paused' and paused_at is not null and state_before_pause is not null)
    or (state <> 'paused' and paused_at is null and state_before_pause is null)
  )
);
create index if not exists idx_quiz_runs_set_created
  on public.quiz_runs (quiz_set_id, created_at desc);
create index if not exists idx_quiz_runs_state
  on public.quiz_runs (state);
create index if not exists idx_quiz_runs_join_code
  on public.quiz_runs (join_code)
  where join_code is not null;

create table if not exists public.quiz_run_participants (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.quiz_runs (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  display_name  text not null,
  joined_at     timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  left_at       timestamptz,
  unique (run_id, user_id),
  unique (id, run_id),
  constraint quiz_run_participants_display_name_nonempty check (length(trim(display_name)) > 0)
);
create index if not exists idx_quiz_run_participants_run
  on public.quiz_run_participants (run_id, joined_at);
create index if not exists idx_quiz_run_participants_user
  on public.quiz_run_participants (user_id, joined_at desc);

create table if not exists public.quiz_answers (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references public.quiz_runs (id) on delete cascade,
  question_id    uuid not null references public.quiz_questions (id) on delete restrict,
  choice_id      uuid not null references public.quiz_choices (id) on delete restrict,
  participant_id uuid not null references public.quiz_run_participants (id) on delete cascade,
  user_id        uuid not null references public.users (id) on delete cascade,
  answered_at    timestamptz not null default statement_timestamp(),
  response_ms    integer not null,
  is_correct     boolean not null,
  score          integer not null default 0,
  unique (run_id, question_id, participant_id),
  constraint quiz_answers_choice_matches_question
    foreign key (choice_id, question_id)
    references public.quiz_choices (id, question_id)
    on delete restrict,
  constraint quiz_answers_participant_matches_run
    foreign key (participant_id, run_id)
    references public.quiz_run_participants (id, run_id)
    on delete cascade,
  constraint quiz_answers_response_ms_nonnegative check (response_ms >= 0),
  constraint quiz_answers_score_nonnegative check (score >= 0)
);
create index if not exists idx_quiz_answers_run_question
  on public.quiz_answers (run_id, question_id);
create index if not exists idx_quiz_answers_participant
  on public.quiz_answers (participant_id, answered_at);
create index if not exists idx_quiz_answers_score
  on public.quiz_answers (run_id, score desc);

create table if not exists public.quiz_voided_questions (
  id                     uuid primary key default gen_random_uuid(),
  run_id                 uuid not null references public.quiz_runs (id) on delete cascade,
  question_id            uuid not null references public.quiz_questions (id) on delete restrict,
  reason                 text,
  voided_by_admin_email  text,
  voided_at              timestamptz not null default now(),
  unique (run_id, question_id)
);
create index if not exists idx_quiz_voided_questions_run
  on public.quiz_voided_questions (run_id, question_id);

create table if not exists public.quiz_run_events (
  id                     uuid primary key default gen_random_uuid(),
  run_id                 uuid not null references public.quiz_runs (id) on delete cascade,
  event                  text not null,
  actor_user_id          uuid references public.users (id) on delete set null,
  actor_admin_email      text,
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  constraint quiz_run_events_event_nonempty check (length(trim(event)) > 0)
);
create index if not exists idx_quiz_run_events_run_created
  on public.quiz_run_events (run_id, created_at desc);

drop trigger if exists trg_quiz_sets_updated on public.quiz_sets;
create trigger trg_quiz_sets_updated
  before update on public.quiz_sets
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_quiz_questions_updated on public.quiz_questions;
create trigger trg_quiz_questions_updated
  before update on public.quiz_questions
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_quiz_runs_updated on public.quiz_runs;
create trigger trg_quiz_runs_updated
  before update on public.quiz_runs
  for each row execute function public.touch_updated_at();

create or replace function public.set_active_quiz_set(p_quiz_set_id uuid)
returns public.quiz_sets
language plpgsql
as $$
declare
  v_set public.quiz_sets%rowtype;
begin
  if p_quiz_set_id is null then
    update public.quiz_sets set is_active = false;
    return null;
  end if;

  select * into v_set
  from public.quiz_sets
  where id = p_quiz_set_id
  for update;

  if not found then
    raise exception 'quiz_set_not_found' using errcode = 'P0002';
  end if;

  update public.quiz_sets
  set is_active = false
  where is_active = true and id <> p_quiz_set_id;

  update public.quiz_sets
  set is_active = true
  where id = p_quiz_set_id
  returning * into v_set;

  return v_set;
end $$;

create or replace function public.sync_quiz_run_timeout(p_run_id uuid)
returns public.quiz_runs
language plpgsql
as $$
declare
  v_run public.quiz_runs%rowtype;
  v_now timestamptz := statement_timestamp();
begin
  select * into v_run
  from public.quiz_runs
  where id = p_run_id
  for update;

  if not found then
    return null;
  end if;

  if v_run.state = 'question_active'
    and v_run.current_question_ends_at is not null
    and v_run.current_question_ends_at <= v_now then
    update public.quiz_runs
    set state = 'question_ended',
        answer_revealed_at = coalesce(answer_revealed_at, v_now),
        updated_at = v_now
    where id = p_run_id
    returning * into v_run;

    insert into public.quiz_run_events (run_id, event, metadata, created_at)
    values (p_run_id, 'question_timeout', jsonb_build_object('question_id', v_run.current_question_id), v_now);
  end if;

  return v_run;
end $$;

create or replace function public.start_quiz_question(p_run_id uuid, p_question_id uuid)
returns public.quiz_runs
language plpgsql
as $$
declare
  v_run public.quiz_runs%rowtype;
  v_question public.quiz_questions%rowtype;
  v_now timestamptz := statement_timestamp();
begin
  select * into v_run
  from public.quiz_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'quiz_run_not_found' using errcode = 'P0002';
  end if;

  if v_run.state = 'ended' then
    raise exception 'quiz_run_ended' using errcode = 'P0001';
  end if;

  select * into v_question
  from public.quiz_questions
  where id = p_question_id
    and quiz_set_id = v_run.quiz_set_id
    and is_active = true;

  if not found then
    raise exception 'quiz_question_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.quiz_voided_questions
    where run_id = p_run_id and question_id = p_question_id
  ) then
    raise exception 'quiz_question_voided' using errcode = 'P0001';
  end if;

  update public.quiz_runs
  set state = 'question_active',
      current_question_id = p_question_id,
      current_question_started_at = v_now,
      current_question_ends_at = v_now + make_interval(secs => v_question.time_limit_seconds),
      answer_revealed_at = null,
      paused_at = null,
      state_before_pause = null,
      updated_at = v_now
  where id = p_run_id
  returning * into v_run;

  insert into public.quiz_run_events (run_id, event, metadata, created_at)
  values (
    p_run_id,
    'question_started',
    jsonb_build_object('question_id', p_question_id, 'time_limit_seconds', v_question.time_limit_seconds),
    v_now
  );

  return v_run;
end $$;

create or replace function public.end_quiz_question(p_run_id uuid)
returns public.quiz_runs
language plpgsql
as $$
declare
  v_run public.quiz_runs%rowtype;
  v_now timestamptz := statement_timestamp();
begin
  select * into v_run
  from public.quiz_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'quiz_run_not_found' using errcode = 'P0002';
  end if;

  if v_run.current_question_id is null then
    raise exception 'quiz_question_not_started' using errcode = 'P0001';
  end if;

  update public.quiz_runs
  set state = 'question_ended',
      answer_revealed_at = coalesce(answer_revealed_at, v_now),
      paused_at = null,
      state_before_pause = null,
      updated_at = v_now
  where id = p_run_id
  returning * into v_run;

  insert into public.quiz_run_events (run_id, event, metadata, created_at)
  values (p_run_id, 'question_ended', jsonb_build_object('question_id', v_run.current_question_id), v_now);

  return v_run;
end $$;

create or replace function public.pause_quiz_run(p_run_id uuid)
returns public.quiz_runs
language plpgsql
as $$
declare
  v_run public.quiz_runs%rowtype;
  v_now timestamptz := statement_timestamp();
begin
  select * into v_run
  from public.quiz_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'quiz_run_not_found' using errcode = 'P0002';
  end if;

  if v_run.state = 'paused' then
    return v_run;
  end if;

  if v_run.state in ('closed', 'ended') then
    raise exception 'quiz_run_cannot_pause' using errcode = 'P0001';
  end if;

  update public.quiz_runs
  set state = 'paused',
      paused_at = v_now,
      state_before_pause = v_run.state,
      updated_at = v_now
  where id = p_run_id
  returning * into v_run;

  insert into public.quiz_run_events (run_id, event, metadata, created_at)
  values (p_run_id, 'run_paused', jsonb_build_object('previous_state', v_run.state_before_pause), v_now);

  return v_run;
end $$;

create or replace function public.resume_quiz_run(p_run_id uuid)
returns public.quiz_runs
language plpgsql
as $$
declare
  v_run public.quiz_runs%rowtype;
  v_now timestamptz := statement_timestamp();
  v_pause_duration interval;
begin
  select * into v_run
  from public.quiz_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'quiz_run_not_found' using errcode = 'P0002';
  end if;

  if v_run.state <> 'paused' then
    return v_run;
  end if;

  v_pause_duration := v_now - v_run.paused_at;

  update public.quiz_runs
  set state = coalesce(v_run.state_before_pause, 'lobby'),
      current_question_ends_at = case
        when v_run.state_before_pause = 'question_active'
          and current_question_ends_at is not null
        then current_question_ends_at + v_pause_duration
        else current_question_ends_at
      end,
      paused_at = null,
      state_before_pause = null,
      updated_at = v_now
  where id = p_run_id
  returning * into v_run;

  insert into public.quiz_run_events (run_id, event, metadata, created_at)
  values (p_run_id, 'run_resumed', jsonb_build_object('state', v_run.state), v_now);

  return v_run;
end $$;

create or replace function public.void_quiz_question(
  p_run_id uuid,
  p_question_id uuid,
  p_reason text default null,
  p_admin_email text default null
)
returns public.quiz_voided_questions
language plpgsql
as $$
declare
  v_run public.quiz_runs%rowtype;
  v_voided public.quiz_voided_questions%rowtype;
  v_now timestamptz := statement_timestamp();
begin
  select * into v_run
  from public.quiz_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'quiz_run_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.quiz_questions
    where id = p_question_id and quiz_set_id = v_run.quiz_set_id
  ) then
    raise exception 'quiz_question_not_found' using errcode = 'P0002';
  end if;

  insert into public.quiz_voided_questions (
    run_id,
    question_id,
    reason,
    voided_by_admin_email,
    voided_at
  )
  values (p_run_id, p_question_id, nullif(trim(p_reason), ''), p_admin_email, v_now)
  on conflict (run_id, question_id) do update
    set reason = excluded.reason,
        voided_by_admin_email = excluded.voided_by_admin_email,
        voided_at = excluded.voided_at
  returning * into v_voided;

  if v_run.current_question_id = p_question_id
    and v_run.state in ('question_active', 'paused') then
    update public.quiz_runs
    set state = 'question_ended',
        answer_revealed_at = coalesce(answer_revealed_at, v_now),
        paused_at = null,
        state_before_pause = null,
        updated_at = v_now
    where id = p_run_id;
  end if;

  insert into public.quiz_run_events (run_id, event, actor_admin_email, metadata, created_at)
  values (
    p_run_id,
    'question_voided',
    p_admin_email,
    jsonb_build_object('question_id', p_question_id, 'reason', p_reason),
    v_now
  );

  return v_voided;
end $$;

create or replace function public.submit_quiz_answer(
  p_run_id uuid,
  p_user_id uuid,
  p_question_id uuid,
  p_choice_id uuid
)
returns table (
  accepted boolean,
  duplicate boolean,
  answer_id uuid,
  is_correct boolean,
  score integer,
  answered_at timestamptz,
  error_code text
)
language plpgsql
as $$
declare
  v_run public.quiz_runs%rowtype;
  v_question public.quiz_questions%rowtype;
  v_choice public.quiz_choices%rowtype;
  v_participant public.quiz_run_participants%rowtype;
  v_answer public.quiz_answers%rowtype;
  v_now timestamptz := statement_timestamp();
  v_duration_ms numeric;
  v_elapsed_ms numeric;
  v_remaining_ratio numeric;
  v_score integer;
begin
  select * into v_run
  from public.quiz_runs
  where id = p_run_id
  for update;

  if not found then
    return query select false, false, null::uuid, false, 0, null::timestamptz, 'run_not_found';
    return;
  end if;

  if v_run.state = 'question_active'
    and v_run.current_question_ends_at is not null
    and v_run.current_question_ends_at <= v_now then
    update public.quiz_runs
    set state = 'question_ended',
        answer_revealed_at = coalesce(answer_revealed_at, v_now),
        updated_at = v_now
    where id = p_run_id;

    insert into public.quiz_run_events (run_id, event, metadata, created_at)
    values (p_run_id, 'question_timeout', jsonb_build_object('question_id', v_run.current_question_id), v_now);

    return query select false, false, null::uuid, false, 0, null::timestamptz, 'timeout';
    return;
  end if;

  if v_run.state <> 'question_active' then
    return query select false, false, null::uuid, false, 0, null::timestamptz, 'answer_closed';
    return;
  end if;

  if v_run.current_question_id is distinct from p_question_id then
    return query select false, false, null::uuid, false, 0, null::timestamptz, 'question_not_active';
    return;
  end if;

  select * into v_participant
  from public.quiz_run_participants
  where run_id = p_run_id
    and user_id = p_user_id
    and left_at is null;

  if not found then
    return query select false, false, null::uuid, false, 0, null::timestamptz, 'not_joined';
    return;
  end if;

  if exists (
    select 1 from public.quiz_voided_questions
    where run_id = p_run_id and question_id = p_question_id
  ) then
    return query select false, false, null::uuid, false, 0, null::timestamptz, 'question_voided';
    return;
  end if;

  select * into v_question
  from public.quiz_questions
  where id = p_question_id
    and quiz_set_id = v_run.quiz_set_id
    and is_active = true;

  if not found then
    return query select false, false, null::uuid, false, 0, null::timestamptz, 'question_not_found';
    return;
  end if;

  select * into v_choice
  from public.quiz_choices
  where id = p_choice_id
    and question_id = p_question_id;

  if not found then
    return query select false, false, null::uuid, false, 0, null::timestamptz, 'choice_not_found';
    return;
  end if;

  if v_run.current_question_started_at is null
    or v_run.current_question_ends_at is null then
    return query select false, false, null::uuid, false, 0, null::timestamptz, 'timer_not_started';
    return;
  end if;

  v_duration_ms := greatest(
    1,
    extract(epoch from (v_run.current_question_ends_at - v_run.current_question_started_at)) * 1000
  );
  v_elapsed_ms := least(
    v_duration_ms,
    greatest(0, extract(epoch from (v_now - v_run.current_question_started_at)) * 1000)
  );
  v_remaining_ratio := greatest(0, 1 - (v_elapsed_ms / v_duration_ms));
  v_score := case
    when v_choice.is_correct then round((v_question.points * (0.5 + (0.5 * v_remaining_ratio)))::numeric)::integer
    else 0
  end;

  insert into public.quiz_answers (
    run_id,
    question_id,
    choice_id,
    participant_id,
    user_id,
    answered_at,
    response_ms,
    is_correct,
    score
  )
  values (
    p_run_id,
    p_question_id,
    p_choice_id,
    v_participant.id,
    p_user_id,
    v_now,
    v_elapsed_ms::integer,
    v_choice.is_correct,
    v_score
  )
  on conflict (run_id, question_id, participant_id) do nothing
  returning * into v_answer;

  if not found then
    select * into v_answer
    from public.quiz_answers
    where run_id = p_run_id
      and question_id = p_question_id
      and participant_id = v_participant.id;

    return query select true, true, v_answer.id, v_answer.is_correct, v_answer.score, v_answer.answered_at, null::text;
    return;
  end if;

  insert into public.quiz_run_events (run_id, event, actor_user_id, metadata, created_at)
  values (
    p_run_id,
    'answer_submitted',
    p_user_id,
    jsonb_build_object('question_id', p_question_id, 'choice_id', p_choice_id, 'score', v_score),
    v_now
  );

  return query select true, false, v_answer.id, v_answer.is_correct, v_answer.score, v_answer.answered_at, null::text;
end $$;

create or replace function public.get_quiz_leaderboard(p_run_id uuid)
returns table (
  place integer,
  participant_id uuid,
  user_id uuid,
  display_name text,
  total_score integer,
  correct_count integer,
  answer_count integer,
  last_answered_at timestamptz
)
language sql
stable
as $$
  select
    row_number() over (
      order by
        coalesce(sum(a.score), 0) desc,
        count(a.id) filter (where a.is_correct) desc,
        max(a.answered_at) asc nulls last,
        p.joined_at asc
    )::integer as place,
    p.id as participant_id,
    p.user_id,
    p.display_name,
    coalesce(sum(a.score), 0)::integer as total_score,
    count(a.id) filter (where a.is_correct)::integer as correct_count,
    count(a.id)::integer as answer_count,
    max(a.answered_at) as last_answered_at
  from public.quiz_run_participants p
  left join public.quiz_answers a
    on a.participant_id = p.id
   and not exists (
     select 1
     from public.quiz_voided_questions vq
     where vq.run_id = a.run_id
       and vq.question_id = a.question_id
   )
  where p.run_id = p_run_id
    and p.left_at is null
  group by p.id, p.user_id, p.display_name, p.joined_at
$$;

alter table public.quiz_sets enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_choices enable row level security;
alter table public.quiz_runs enable row level security;
alter table public.quiz_run_participants enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_voided_questions enable row level security;
alter table public.quiz_run_events enable row level security;

revoke all on table
  public.quiz_sets,
  public.quiz_questions,
  public.quiz_choices,
  public.quiz_runs,
  public.quiz_run_participants,
  public.quiz_answers,
  public.quiz_voided_questions,
  public.quiz_run_events
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.quiz_sets,
  public.quiz_questions,
  public.quiz_choices,
  public.quiz_runs,
  public.quiz_run_participants,
  public.quiz_answers,
  public.quiz_voided_questions,
  public.quiz_run_events
to service_role;

revoke usage on type public.quiz_run_mode, public.quiz_run_state
from public, anon, authenticated;

grant usage on type public.quiz_run_mode, public.quiz_run_state
to service_role;

revoke execute on function public.set_active_quiz_set(uuid) from public, anon, authenticated;
revoke execute on function public.sync_quiz_run_timeout(uuid) from public, anon, authenticated;
revoke execute on function public.start_quiz_question(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.end_quiz_question(uuid) from public, anon, authenticated;
revoke execute on function public.pause_quiz_run(uuid) from public, anon, authenticated;
revoke execute on function public.resume_quiz_run(uuid) from public, anon, authenticated;
revoke execute on function public.void_quiz_question(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.submit_quiz_answer(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.get_quiz_leaderboard(uuid) from public, anon, authenticated;

grant execute on function public.set_active_quiz_set(uuid) to service_role;
grant execute on function public.sync_quiz_run_timeout(uuid) to service_role;
grant execute on function public.start_quiz_question(uuid, uuid) to service_role;
grant execute on function public.end_quiz_question(uuid) to service_role;
grant execute on function public.pause_quiz_run(uuid) to service_role;
grant execute on function public.resume_quiz_run(uuid) to service_role;
grant execute on function public.void_quiz_question(uuid, uuid, text, text) to service_role;
grant execute on function public.submit_quiz_answer(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.get_quiz_leaderboard(uuid) to service_role;
