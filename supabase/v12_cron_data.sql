-- =====================================================================
-- v12: Lets the daily crons (reminders, morning brief, transit alerts) run without the Supabase secret key.
-- cron_data() returns only what the crons need, and only when called with the secret kept in Vercel (CRON_DB_SECRET)
-- and in cron_secret below. Nobody else can read the table or call the function successfully. Safe to run more than once.
-- Set the secret separately:  insert into public.cron_secret (id, v) values (1, '<CRON_DB_SECRET>') on conflict (id) do update set v = excluded.v;
-- =====================================================================
create table if not exists public.cron_secret (id integer primary key check (id = 1), v text not null);
alter table public.cron_secret enable row level security;
revoke all on table public.cron_secret from anon, authenticated;

create or replace function public.cron_data(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if p_secret is null or not exists (select 1 from public.cron_secret where id = 1 and v = p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'push_subscriptions', coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'user_id', user_id, 'p256dh', p256dh, 'auth', auth, 'lang', lang)) from public.push_subscriptions), '[]'),
    'user_settings', coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'reminders', reminders)) from public.user_settings where reminders is not null), '[]'),
    'sadhanas', coalesce((select jsonb_agg(to_jsonb(s)) from public.sadhanas s where s.status = 'active' and s.remind), '[]'),
    'kundalis', coalesce((select jsonb_agg(jsonb_build_object('user_id', k.user_id, 'name', k.name, 'birth', k.birth, 'relation', k.relation))
      from public.kundalis k where k.user_id in (select user_id from public.push_subscriptions)), '[]')
  );
end $$;
revoke all on function public.cron_data(text) from public;
grant execute on function public.cron_data(text) to anon, authenticated;
