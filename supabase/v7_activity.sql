-- =====================================================================
-- v7: Activity log (page views, tool use, sign-ins, errors), visible only to the super admin.
-- Safe to run more than once.
-- Writes go through log_activity() (security definer): the caller's account is taken from the session,
-- never from the request, and no table policy lets anyone read or write the log directly.
-- =====================================================================
create table if not exists public.activity_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users(id) on delete set null,
  email      text,
  visitor    text,            -- random id kept in the browser, to count unique visitors
  session    text,            -- random id per browser tab session
  event      text not null,   -- page_view, login, signup, logout, kundali, matching, numerology, js_error …
  page       text,
  lang       text,
  platform   text,            -- web | app
  device     text,            -- e.g. "Android · Chrome · mobile"
  referrer   text,
  country    text,
  region     text,
  city       text,
  detail     jsonb
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_user_idx on public.activity_log (user_id, created_at desc);
create index if not exists activity_log_event_idx on public.activity_log (event, created_at desc);
create index if not exists activity_log_visitor_idx on public.activity_log (visitor, created_at desc);
alter table public.activity_log enable row level security;
-- (no policies: nobody reads or writes the table directly)

-- Super admin: an admin whose account email is the owner's
create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.admins a join auth.users u on u.id = a.user_id
    where a.user_id = auth.uid() and lower(u.email) = 'ramboghani726@gmail.com'
  );
$$;
revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

-- Write up to 25 events at once. Strings are trimmed; detail (including tool inputs) is dropped if larger than 8 KB.
create or replace function public.log_activity(p_events jsonb, p_country text default null, p_region text default null, p_city text default null)
returns integer language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  mail text;
  e jsonb;
  n integer := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then return 0; end if;
  if uid is not null then select email into mail from auth.users where id = uid; end if;
  for e in select value from jsonb_array_elements(p_events) limit 25 loop
    if coalesce(e->>'event', '') = '' then continue; end if;
    insert into public.activity_log (user_id, email, visitor, session, event, page, lang, platform, device, referrer, country, region, city, detail)
    values (uid, mail,
      left(e->>'visitor', 40), left(e->>'session', 40), left(e->>'event', 40), left(e->>'page', 300), left(e->>'lang', 8),
      left(e->>'platform', 10), left(e->>'device', 80), left(e->>'referrer', 200),
      left(p_country, 4), left(p_region, 60), left(p_city, 80),
      case when e ? 'detail' and length((e->'detail')::text) <= 8000 then e->'detail' else null end);
    n := n + 1;
  end loop;
  -- Keep 180 days
  if random() < 0.005 then delete from public.activity_log where created_at < now() - interval '180 days'; end if;
  return n;
end $$;
revoke all on function public.log_activity(jsonb, text, text, text) from public;
grant execute on function public.log_activity(jsonb, text, text, text) to anon, authenticated;

-- Read the log (newest first, keyset paging with p_before = smallest id already shown)
create or replace function public.admin_activity(p_since timestamptz default now() - interval '7 days', p_event text default null, p_q text default null,
  p_before bigint default null, p_limit integer default 200, p_hide_self boolean default false)
returns setof public.activity_log language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_superadmin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select * from public.activity_log l
    where l.created_at >= p_since
      and (p_event is null or p_event = '' or l.event = p_event)
      and (p_before is null or l.id < p_before)
      and (not p_hide_self or l.user_id is distinct from auth.uid())
      and (p_q is null or p_q = '' or concat_ws(' ', l.email, l.page, l.city, l.region, l.country, l.device, l.visitor, l.detail::text) ilike '%' || p_q || '%')
    order by l.id desc
    limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end $$;
revoke all on function public.admin_activity(timestamptz, text, text, bigint, integer, boolean) from public, anon;
grant execute on function public.admin_activity(timestamptz, text, text, bigint, integer, boolean) to authenticated;

-- Summary for the dashboard
create or replace function public.admin_activity_stats(p_since timestamptz default now() - interval '7 days', p_hide_self boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare out jsonb;
begin
  if not public.is_superadmin() then raise exception 'not authorized' using errcode = '42501'; end if;
  with l as (select * from public.activity_log where created_at >= p_since and (not p_hide_self or user_id is distinct from auth.uid()))
  select jsonb_build_object(
    'events',   (select count(*) from l),
    'views',    (select count(*) from l where event = 'page_view'),
    'visitors', (select count(distinct visitor) from l),
    'users',    (select count(distinct user_id) from l where user_id is not null),
    'logins',   (select count(*) from l where event = 'login'),
    'signups',  (select count(*) from l where event = 'signup'),
    'errors',   (select count(*) from l where event in ('js_error', 'api_error')),
    'app',      (select count(distinct visitor) from l where platform = 'app'),
    'byEvent',  coalesce((select jsonb_agg(x order by x.n desc) from (select event as k, count(*) as n from l group by event) x), '[]'),
    'byPage',   coalesce((select jsonb_agg(x order by x.n desc) from (select page as k, count(*) as n from l where event = 'page_view' group by page order by count(*) desc limit 15) x), '[]'),
    'byCity',   coalesce((select jsonb_agg(x order by x.n desc) from (select concat_ws(', ', city, country) as k, count(distinct visitor) as n from l where country is not null group by 1 order by 2 desc limit 15) x), '[]'),
    'byLang',   coalesce((select jsonb_agg(x order by x.n desc) from (select lang as k, count(distinct visitor) as n from l group by lang) x), '[]'),
    'byDay',    coalesce((select jsonb_agg(x order by x.k) from (select to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as k, count(*) filter (where event = 'page_view') as n, count(distinct visitor) as v from l group by 1) x), '[]')
  ) into out;
  return out;
end $$;
revoke all on function public.admin_activity_stats(timestamptz, boolean) from public, anon;
grant execute on function public.admin_activity_stats(timestamptz, boolean) to authenticated;
revoke all on table public.activity_log from anon, authenticated;
