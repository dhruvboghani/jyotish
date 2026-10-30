-- =====================================================================
-- v9: Nadi "Proof" scorecard. Anonymous feedback: did real life events fall in years the chart signalled,
-- and did tracked predictions come true? No birth details are stored. Safe to run more than once.
-- =====================================================================
create table if not exists public.nadi_feedback (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cid        text not null unique,          -- random id from the browser, so a changed answer updates the row
  kind       text not null check (kind in ('event', 'prediction')),
  event_type text,                          -- marriage, career … (events)
  rule       text,                          -- e.g. Jupiter>Venus:conj (predictions)
  year       integer,
  has_month  boolean,
  matched    text check (matched in ('strong', 'some', 'weak')),
  base       real,                          -- share of this person's years that show the event type (chance level)
  outcome    text check (outcome in ('yes', 'partly', 'no')),
  visitor    text,
  user_id    uuid references auth.users(id) on delete set null
);
create index if not exists nadi_feedback_kind_idx on public.nadi_feedback (kind, event_type);
alter table public.nadi_feedback enable row level security;
revoke all on table public.nadi_feedback from anon, authenticated;

create or replace function public.submit_nadi_feedback(p jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare k text := p->>'kind';
begin
  if k not in ('event', 'prediction') or coalesce(length(p->>'cid'), 0) not between 6 and 40 then return false; end if;
  if k = 'event' and (p->>'event_type') not in ('marriage','career','child','property','education','abroad','money','health','loss') then return false; end if;
  if k = 'prediction' and ((p->>'rule') !~ '^(Jupiter|Saturn)>(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|BB):(conj|opp|trine)$' or (p->>'outcome') not in ('yes','partly','no')) then return false; end if;
  insert into public.nadi_feedback (cid, kind, event_type, rule, year, has_month, matched, base, outcome, visitor, user_id)
  values (p->>'cid', k, case when k = 'event' then p->>'event_type' end, case when k = 'prediction' then p->>'rule' end,
    case when (p->>'year') ~ '^\d{4}$' and (p->>'year')::int between 1900 and 2100 then (p->>'year')::int end,
    case when k = 'event' then coalesce((p->>'has_month')::boolean, false) end,
    case when k = 'event' and p->>'matched' in ('strong','some','weak') then p->>'matched' end,
    case when k = 'event' and (p->>'base') ~ '^[0-9.]+$' then least(greatest((p->>'base')::real, 0), 1) end,
    case when k = 'prediction' then p->>'outcome' end, left(p->>'visitor', 40), auth.uid())
  on conflict (cid) do update set outcome = excluded.outcome, matched = excluded.matched, updated_at = now()
    where nadi_feedback.kind = excluded.kind;
  return true;
end $$;
revoke all on function public.submit_nadi_feedback(jsonb) from public;
grant execute on function public.submit_nadi_feedback(jsonb) to anon, authenticated;

-- Public aggregates only
create or replace function public.nadi_proof_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  with e as (select * from public.nadi_feedback where kind = 'event'), pr as (select * from public.nadi_feedback where kind = 'prediction')
  select jsonb_build_object(
    'total_events', (select count(*) from e),
    'hit',  (select avg(case when matched = 'strong' then 1.0 else 0 end) from e),
    'base', (select avg(base) from e),
    'events', coalesce((select jsonb_agg(x order by x.n desc) from (select event_type as k, count(*) as n, avg(case when matched = 'strong' then 1.0 else 0 end) as hit, avg(base) as base from e group by event_type) x), '[]'),
    'predictions', (select jsonb_build_object('n', count(*), 'yes', avg(case when outcome = 'yes' then 1.0 else 0 end), 'partly', avg(case when outcome = 'partly' then 1.0 else 0 end)) from pr)
  );
$$;
revoke all on function public.nadi_proof_stats() from public;
grant execute on function public.nadi_proof_stats() to anon, authenticated;

-- "Ask my chart": daily question quota per account
create table if not exists public.ask_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default (now() at time zone 'Asia/Kolkata')::date,
  n       integer not null default 0,
  primary key (user_id, day)
);
alter table public.ask_usage enable row level security;
revoke all on table public.ask_usage from anon, authenticated;
-- Takes one question from today's allowance; returns how many are left after this one, or -1 when none are left
create or replace function public.ask_take(p_limit integer default 10) returns integer
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := (now() at time zone 'Asia/Kolkata')::date; used integer; lim integer := least(greatest(coalesce(p_limit, 10), 1), 50);
begin
  if uid is null then return -1; end if;
  if public.is_superadmin() then lim := 200; end if;
  insert into public.ask_usage (user_id, day, n) values (uid, d, 0) on conflict do nothing;
  update public.ask_usage set n = n + 1 where user_id = uid and day = d and n < lim returning n into used;
  if used is null then return -1; end if;
  delete from public.ask_usage where day < d - 30 and random() < 0.05;
  return lim - used;
end $$;
revoke all on function public.ask_take(integer) from public, anon;
grant execute on function public.ask_take(integer) to authenticated;
