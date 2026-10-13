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

-- =====================================================================
-- Admin role (added v2.1). Safe to run more than once.
-- =====================================================================
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "Admins see own admin row" on public.admins;
create policy "Admins see own admin row" on public.admins for select using (auth.uid() = user_id);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;

-- Admins can read every saved Kundali
drop policy if exists "Admins read all kundalis" on public.kundalis;
create policy "Admins read all kundalis" on public.kundalis for select using (public.is_admin());

-- Users with chart counts, for the admin panel only
create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz, confirmed boolean, charts bigint)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, (u.raw_user_meta_data->>'full_name')::text, u.created_at, u.last_sign_in_at,
           (u.email_confirmed_at is not null), count(k.id)
    from auth.users u left join public.kundalis k on k.user_id = u.id
    group by u.id order by u.created_at desc;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- Make an account an admin (the account must exist first: sign up, or Authentication → Users → Add user)
insert into public.admins (user_id)
select id from auth.users where lower(email) = 'ramboghani726@gmail.com'
on conflict do nothing;
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
