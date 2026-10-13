-- =====================================================================
-- Kundali history (v2.2): every Kundali a user generates, with time.
-- Run once in Supabase → SQL Editor, after schema.sql and admin.sql. Safe to run more than once.
-- =====================================================================
create table if not exists public.kundali_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text,
  birth       jsonb not null,   -- { name, year, month, day, hour, minute, lat, lon, tzMinutes, placeLabel }
  summary     jsonb,            -- { lagna, moon, nak, pada } for the list view
  lang        text,
  source      text not null default 'web',   -- 'web' | 'session' (moved in from a logged-out session)
  created_at  timestamptz not null default now()
);
create index if not exists kundali_history_user_idx on public.kundali_history (user_id, created_at desc);

alter table public.kundali_history enable row level security;
drop policy if exists "History read own"   on public.kundali_history;
drop policy if exists "History insert own" on public.kundali_history;
drop policy if exists "History delete own" on public.kundali_history;
drop policy if exists "History admin read" on public.kundali_history;
create policy "History read own"   on public.kundali_history for select using (auth.uid() = user_id);
create policy "History insert own" on public.kundali_history for insert with check (auth.uid() = user_id);
create policy "History delete own" on public.kundali_history for delete using (auth.uid() = user_id);
-- Admins can read everyone's history (needs admin.sql to have been run first)
create policy "History admin read" on public.kundali_history for select using (public.is_admin());
