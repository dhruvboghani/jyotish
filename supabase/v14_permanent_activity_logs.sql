-- Grahavani: Retain all activity logs permanently (no 180-day deletion).
-- Run once in Supabase -> SQL Editor. Safe to run at any time.

create or replace function public.log_activity(
  p_events jsonb,
  p_country text default null,
  p_region text default null,
  p_city text default null
)
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
    values (
      uid, mail,
      left(e->>'visitor', 40), left(e->>'session', 40), left(e->>'event', 40), left(e->>'page', 300), left(e->>'lang', 8),
      left(e->>'platform', 10), left(e->>'device', 80), left(e->>'referrer', 200),
      left(p_country, 4), left(p_region, 60), left(p_city, 80),
      case when e ? 'detail' and length((e->'detail')::text) <= 8000 then e->'detail' else null end
    );
    n := n + 1;
  end loop;

  -- Permanent retention: logs are kept indefinitely, never deleted.
  return n;
end $$;

revoke all on function public.log_activity(jsonb, text, text, text) from public;
grant execute on function public.log_activity(jsonb, text, text, text) to anon, authenticated;
