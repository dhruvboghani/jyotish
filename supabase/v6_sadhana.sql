-- =====================================================================
-- Grahavani v6: sadhana (remedy) tracker.
-- Run in Supabase → SQL Editor after the earlier scripts. Safe to run more than once.
-- =====================================================================
create table if not exists public.sadhanas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('mantra', 'fast', 'daan', 'custom')),
  planet      text check (planet in ('Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu')),
  title       text not null check (char_length(title) between 1 and 200),
  target      int  check (target between 1 and 100000),           -- japa count each session
  cadence     text not null default 'daily' check (cadence in ('daily', 'weekly')),
  weekday     int  check (weekday between 0 and 6),                -- for weekly: 0 = Sunday
  total       int  not null default 40 check (total between 1 and 400),
  start_date  date not null default current_date,
  done_dates  date[] not null default '{}',
  tz_minutes  int  not null default 330 check (tz_minutes between -720 and 840),
  remind      boolean not null default true,
  birth_key   text,
  person      text check (char_length(person) <= 120),
  lang        text,
  status      text not null default 'active' check (status in ('active', 'done', 'stopped')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sadhanas_user_idx on public.sadhanas (user_id, created_at desc);
create index if not exists sadhanas_remind_idx on public.sadhanas (status) where remind;
alter table public.sadhanas enable row level security;
drop policy if exists "Sadhana own" on public.sadhanas;
create policy "Sadhana own" on public.sadhanas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
