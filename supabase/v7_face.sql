-- Grahavani v7: Samudrika Shastra Face Reading with base64 selfie storage.
-- Run once in Supabase → SQL Editor. Safe to run more than once.

create table if not exists public.face_readings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  photo_base64 text not null,
  features     jsonb not null default '{}'::jsonb,
  report       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists face_readings_user_idx on public.face_readings (user_id, created_at desc);

alter table public.face_readings enable row level security;

drop policy if exists "Face readings insert" on public.face_readings;
drop policy if exists "Face readings select" on public.face_readings;

create policy "Face readings insert" on public.face_readings
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Face readings select" on public.face_readings
  for select using (auth.uid() = user_id or user_id is null);
