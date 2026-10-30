-- =====================================================================
-- v11: Admins can delete any user's saved Kundali or history entry, and any user account.
-- The super admin's own account and the caller's own account can't be deleted from here. Safe to run more than once.
-- =====================================================================
create or replace function public.admin_delete_kundali(p_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.kundalis where id = p_id; get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.admin_delete_kundali(uuid) from public, anon;
grant execute on function public.admin_delete_kundali(uuid) to authenticated;

create or replace function public.admin_delete_history(p_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.kundali_history where id = p_id; get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.admin_delete_history(uuid) from public, anon;
grant execute on function public.admin_delete_history(uuid) to authenticated;

-- Deletes the account and, through the foreign keys, its saved Kundalis, history, notes, shares, settings and reminders.
-- Activity-log rows stay, with the account link cleared.
create or replace function public.admin_delete_user(p_user uuid) returns integer
language plpgsql security definer set search_path = public, auth as $$
declare n integer; em text;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'cannot delete your own account here' using errcode = '42501'; end if;
  select lower(email) into em from auth.users where id = p_user;
  if em = 'ramboghani726@gmail.com' then raise exception 'cannot delete the owner account' using errcode = '42501'; end if;
  if exists (select 1 from public.admins where user_id = p_user) and not public.is_superadmin() then raise exception 'only the owner can delete an admin' using errcode = '42501'; end if;
  delete from auth.users where id = p_user; get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
