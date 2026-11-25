-- Grahavani v8: Hastarekha Shastra Palm Reading with base64 photo and line detection storage.
-- Run once in Supabase -> SQL Editor. Safe to run more than once.

create table if not exists public.palm_readings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  photo_base64 text not null,
  lines        jsonb not null default '{}'::jsonb,
  features     jsonb not null default '{}'::jsonb,
  report       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists palm_readings_user_idx on public.palm_readings (user_id, created_at desc);

alter table public.palm_readings enable row level security;

drop policy if exists "Palm readings insert" on public.palm_readings;
drop policy if exists "Palm readings select" on public.palm_readings;

create policy "Palm readings insert" on public.palm_readings
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Palm readings select" on public.palm_readings
  for select using (auth.uid() = user_id or user_id is null);
