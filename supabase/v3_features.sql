-- =====================================================================
-- Grahavani v3: family relation tags and private share links.
-- Run in Supabase → SQL Editor after the earlier scripts. Safe to run more than once.
-- =====================================================================

-- Family profiles: relation of each saved chart to the account holder
alter table public.kundalis add column if not exists relation text
  check (relation is null or relation in ('self','spouse','father','mother','son','daughter','brother','sister','friend','other'));

-- Private share links (anyone with the link can view that one chart)
create table if not exists public.kundali_shares (
  token       text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  birth       jsonb not null,
  birth_key   text not null,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists kundali_shares_user_idx on public.kundali_shares (user_id, birth_key);
alter table public.kundali_shares enable row level security;
drop policy if exists "Shares read own"   on public.kundali_shares;
drop policy if exists "Shares insert own" on public.kundali_shares;
drop policy if exists "Shares update own" on public.kundali_shares;
create policy "Shares read own"   on public.kundali_shares for select using (auth.uid() = user_id);
create policy "Shares insert own" on public.kundali_shares for insert with check (auth.uid() = user_id);
create policy "Shares update own" on public.kundali_shares for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public lookup by token only (no listing). Returns nothing for unknown or revoked links.
create or replace function public.get_shared_kundali(share_token text)
returns table (birth jsonb)
language sql stable security definer set search_path = public as $$
  select s.birth from public.kundali_shares s where s.token = share_token and not s.revoked limit 1;
$$;
revoke all on function public.get_shared_kundali(text) from public;
grant execute on function public.get_shared_kundali(text) to anon, authenticated;
