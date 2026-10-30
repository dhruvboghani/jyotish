-- =====================================================================
-- v10: Sign-up without email verification.
-- /api/signup calls register_user() with a server-only secret (env SIGNUP_SECRET, also stored in private.app_secret),
-- so accounts are created already confirmed and the browser logs in at once. Works without the Supabase secret key.
-- Safe to run more than once. Set the secret separately:
--   insert into private.app_secret (k, v) values ('signup', '<same value as SIGNUP_SECRET>')
--   on conflict (k) do update set v = excluded.v;
-- =====================================================================
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_secret (k text primary key, v text not null);
revoke all on table private.app_secret from public, anon, authenticated;

create or replace function public.register_user(p_secret text, p_email text, p_password text, p_name text default null, p_lang text default null)
returns text language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid := gen_random_uuid(); em text := lower(trim(p_email)); now_ timestamptz := now();
begin
  if p_secret is null or not exists (select 1 from private.app_secret where k = 'signup' and v = p_secret) then return 'forbidden'; end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(em) > 200 then return 'invalid_email'; end if;
  if length(coalesce(p_password, '')) < 6 or length(p_password) > 72 then return 'weak_password'; end if;
  if exists (select 1 from auth.users where lower(email) = em and deleted_at is null) then return 'exists'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now_,
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_strip_nulls(jsonb_build_object('full_name', nullif(left(trim(coalesce(p_name, '')), 80), ''), 'lang', nullif(left(coalesce(p_lang, ''), 5), ''), 'email_verified', true)),
    now_, now_, '', '', '', '');
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true, 'phone_verified', false), 'email', null, now_, now_);
  return 'ok';
end $$;
revoke all on function public.register_user(text, text, text, text, text) from public;
grant execute on function public.register_user(text, text, text, text, text) to anon, authenticated;

-- Any account created through normal Supabase sign-up is confirmed straight away too (no verification step)
create or replace function private.autoconfirm_user() returns trigger language plpgsql security definer set search_path = auth as $$
begin
  if new.email is not null and new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end $$;
drop trigger if exists autoconfirm_user on auth.users;
create trigger autoconfirm_user before insert on auth.users for each row execute function private.autoconfirm_user();
