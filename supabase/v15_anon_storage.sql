-- =====================================================================
-- Grahavani v15: Anonymous Data Storage for All Features Without Login
-- Kundali, Face Reading, Palm Reading, Moles, Forehead, Signature,
-- Thumbprint, Foot Reading, Eye Reading, and Dream Calculator.
-- Safe to run in Supabase -> SQL Editor at any time.
-- =====================================================================

-- 1. Kundalis table: Allow anonymous saving
alter table public.kundalis alter column user_id drop not null;
alter table public.kundalis alter column user_id drop default;
drop policy if exists "Users insert own kundalis" on public.kundalis;
create policy "Users insert own kundalis" on public.kundalis
  for insert with check (auth.uid() = user_id or user_id is null);

-- 2. Kundali History: Allow storing every chart without login (user_id = null)
alter table public.kundali_history alter column user_id drop not null;
alter table public.kundali_history alter column user_id drop default;
drop policy if exists "History insert own" on public.kundali_history;
drop policy if exists "History insert anon" on public.kundali_history;
create policy "History insert anon" on public.kundali_history
  for insert with check (auth.uid() = user_id or user_id is null);

-- 3. Face Readings: Ensure table exists and allows anonymous inserts
create table if not exists public.face_readings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  photo_base64 text not null,
  features     jsonb not null default '{}'::jsonb,
  report       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
alter table public.face_readings alter column user_id drop not null;
create index if not exists face_readings_user_idx on public.face_readings (user_id, created_at desc);
alter table public.face_readings enable row level security;
drop policy if exists "Face readings insert" on public.face_readings;
drop policy if exists "Face readings select" on public.face_readings;
create policy "Face readings insert" on public.face_readings
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "Face readings select" on public.face_readings
  for select using (auth.uid() = user_id or user_id is null or public.is_admin());

-- 4. Palm Readings: Ensure table exists and allows anonymous inserts
create table if not exists public.palm_readings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  photo_base64 text not null,
  lines        jsonb not null default '{}'::jsonb,
  features     jsonb not null default '{}'::jsonb,
  report       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
alter table public.palm_readings alter column user_id drop not null;
create index if not exists palm_readings_user_idx on public.palm_readings (user_id, created_at desc);
alter table public.palm_readings enable row level security;
drop policy if exists "Palm readings insert" on public.palm_readings;
drop policy if exists "Palm readings select" on public.palm_readings;
create policy "Palm readings insert" on public.palm_readings
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "Palm readings select" on public.palm_readings
  for select using (auth.uid() = user_id or user_id is null or public.is_admin());

-- 5. Universal Divination Readings (Moles, Forehead, Signature, Thumb, Foot, Eye, Dreamcalc)
create table if not exists public.divination_readings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  kind       text not null, -- 'moles' | 'forehead' | 'signature' | 'thumb' | 'foot' | 'eye' | 'dreamcalc'
  input      jsonb not null default '{}'::jsonb,
  result     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists divination_readings_kind_idx on public.divination_readings (kind, created_at desc);
create index if not exists divination_readings_user_idx on public.divination_readings (user_id, created_at desc);

alter table public.divination_readings enable row level security;
drop policy if exists "Divination insert" on public.divination_readings;
drop policy if exists "Divination select" on public.divination_readings;
create policy "Divination insert" on public.divination_readings
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "Divination select" on public.divination_readings
  for select using (auth.uid() = user_id or user_id is null or public.is_admin());
