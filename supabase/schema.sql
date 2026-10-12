-- Kundali Ganit: run this once in Supabase → SQL Editor.
-- Stores each chart a logged-in user generates. Row Level Security keeps every user's charts private.

create table if not exists public.kundalis (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text,
  birth       jsonb not null,          -- { year, month, day, hour, minute, lat, lon, tzMinutes, placeLabel, name }
  birth_key   text not null,           -- de-duplicates the same birth for the same user
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, birth_key)
);

create index if not exists kundalis_user_created_idx on public.kundalis (user_id, created_at desc);

alter table public.kundalis enable row level security;

drop policy if exists "Users read own kundalis"   on public.kundalis;
drop policy if exists "Users insert own kundalis" on public.kundalis;
drop policy if exists "Users update own kundalis" on public.kundalis;
drop policy if exists "Users delete own kundalis" on public.kundalis;

create policy "Users read own kundalis"   on public.kundalis for select using (auth.uid() = user_id);
create policy "Users insert own kundalis" on public.kundalis for insert with check (auth.uid() = user_id);
create policy "Users update own kundalis" on public.kundalis for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own kundalis" on public.kundalis for delete using (auth.uid() = user_id);

-- Keep updated_at fresh on upsert
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists kundalis_touch on public.kundalis;
create trigger kundalis_touch before update on public.kundalis
for each row execute function public.touch_updated_at();
