-- =====================================================================
-- Kundali Ganit v5: browser (web push) notifications.
-- Run in Supabase → SQL Editor after the earlier scripts. Safe to run more than once.
-- =====================================================================
create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  lang        text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "Push own" on public.push_subscriptions;
create policy "Push own" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
