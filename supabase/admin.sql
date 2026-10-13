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
