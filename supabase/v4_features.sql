-- =====================================================================
-- Grahavani v4: chart notes, PDF branding, reminder settings and a private calendar feed.
-- Run in Supabase → SQL Editor after the earlier scripts. Safe to run more than once.
-- Also confirms any account that was left waiting for email verification.
-- =====================================================================

-- Private notes on a chart (keyed by the birth details, so they follow the chart everywhere)
create table if not exists public.kundali_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  birth_key   text not null,
  body        text not null check (char_length(body) between 1 and 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists kundali_notes_user_idx on public.kundali_notes (user_id, birth_key, created_at desc);
alter table public.kundali_notes enable row level security;
drop policy if exists "Notes own" on public.kundali_notes;
create policy "Notes own" on public.kundali_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One settings row per account: PDF branding, reminders, calendar-feed token
create table if not exists public.user_settings (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  brand       jsonb,
  reminders   jsonb,
  feed_token  text unique check (feed_token is null or char_length(feed_token) >= 24),
  updated_at  timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "Settings own" on public.user_settings;
create policy "Settings own" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Calendar apps fetch the feed without logging in, so they look it up by its secret token only.
create or replace function public.get_feed(feed text)
returns table (reminders jsonb)
language sql stable security definer set search_path = public as $$
  select s.reminders from public.user_settings s where s.feed_token = feed and char_length(feed) >= 24 limit 1;
$$;
revoke all on function public.get_feed(text) from public;
grant execute on function public.get_feed(text) to anon, authenticated;

-- Accounts created while "Confirm email" was on can log in straight away
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
