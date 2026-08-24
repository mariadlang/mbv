-- My Best Version: identidad, trial, Premium y auditoría.
-- Los datos personales del planner permanecen en IndexedDB; esta migración sólo
-- contiene identidad mínima y derechos de acceso.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'user' check (role in ('user', 'superadmin')),
  access_status text not null default 'trial' check (access_status in ('trial', 'active', 'expired', 'blocked')),
  subscription_status text not null default 'none' check (subscription_status in ('none', 'pending', 'active', 'cancelled')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  target_user_id uuid not null references auth.users(id),
  action text not null,
  previous_access_status text,
  next_access_status text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.access_audit_log enable row level security;

create or replace function public.is_superadmin(candidate uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where user_id = candidate and role = 'superadmin') $$;

revoke all on function public.is_superadmin(uuid) from public;
grant execute on function public.is_superadmin(uuid) to authenticated;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles for select to authenticated
using (user_id = auth.uid() or public.is_superadmin());

drop policy if exists "audit_admin_read" on public.access_audit_log;
create policy "audit_admin_read" on public.access_audit_log for select to authenticated
using (public.is_superadmin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name, role, access_status, subscription_status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when lower(coalesce(new.email, '')) = 'maria.delosangelesgtg@gmail.com' then 'superadmin' else 'user' end,
    case when lower(coalesce(new.email, '')) = 'maria.delosangelesgtg@gmail.com' then 'active' else 'trial' end,
    case when lower(coalesce(new.email, '')) = 'maria.delosangelesgtg@gmail.com' then 'active' else 'none' end
  ) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into public.profiles (user_id, email, display_name, role, access_status, subscription_status)
select id, coalesce(email, ''), coalesce(raw_user_meta_data ->> 'full_name', split_part(coalesce(email, ''), '@', 1)),
  case when lower(coalesce(email, '')) = 'maria.delosangelesgtg@gmail.com' then 'superadmin' else 'user' end,
  case when lower(coalesce(email, '')) = 'maria.delosangelesgtg@gmail.com' then 'active' else 'trial' end,
  case when lower(coalesce(email, '')) = 'maria.delosangelesgtg@gmail.com' then 'active' else 'none' end
from auth.users on conflict (user_id) do nothing;

create or replace function public.ensure_user_access()
returns table (
  user_id uuid, email text, display_name text, role text, access_status text,
  subscription_status text, trial_started_at timestamptz, trial_ends_at timestamptz, server_now timestamptz
) language plpgsql security definer set search_path = public, auth
as $$
declare current_id uuid := auth.uid();
begin
  if current_id is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from auth.users where id = current_id and email_confirmed_at is not null) then
    raise exception 'verified email required';
  end if;

  update public.profiles p set
    trial_started_at = case when p.role = 'user' and p.trial_started_at is null then now() else p.trial_started_at end,
    trial_ends_at = case when p.role = 'user' and p.trial_ends_at is null then now() + interval '15 days' else p.trial_ends_at end,
    access_status = case
      when p.role = 'superadmin' then 'active'
      when p.access_status = 'blocked' then 'blocked'
      when p.subscription_status = 'active' then 'active'
      when p.trial_ends_at is not null and now() >= p.trial_ends_at then 'expired'
      else 'trial'
    end,
    updated_at = now()
  where p.user_id = current_id;

  return query select p.user_id, p.email, p.display_name, p.role, p.access_status,
    p.subscription_status, p.trial_started_at, p.trial_ends_at, now()
  from public.profiles p where p.user_id = current_id;
end;
$$;

revoke all on function public.ensure_user_access() from public;
grant execute on function public.ensure_user_access() to authenticated;

create or replace function public.admin_list_accounts()
returns table (user_id uuid, email text, display_name text, role text, access_status text, subscription_status text, trial_ends_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  return query select p.user_id, p.email, p.display_name, p.role, p.access_status, p.subscription_status, p.trial_ends_at, p.updated_at from public.profiles p order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_accounts() from public;
grant execute on function public.admin_list_accounts() to authenticated;

create or replace function public.admin_set_premium(target_user_id uuid, enable_premium boolean, audit_note text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare previous_status text;
begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  select access_status into previous_status from public.profiles where user_id = target_user_id for update;
  if previous_status is null then raise exception 'account not found'; end if;
  update public.profiles set
    access_status = case when enable_premium then 'active' else case when trial_ends_at > now() then 'trial' else 'expired' end end,
    subscription_status = case when enable_premium then 'active' else 'cancelled' end,
    updated_at = now()
  where user_id = target_user_id;
  insert into public.access_audit_log(actor_user_id, target_user_id, action, previous_access_status, next_access_status, note)
  values(auth.uid(), target_user_id, case when enable_premium then 'premium_enabled' else 'premium_disabled' end, previous_status, case when enable_premium then 'active' else case when (select trial_ends_at from public.profiles where user_id = target_user_id) > now() then 'trial' else 'expired' end end, audit_note);
end;
$$;

revoke all on function public.admin_set_premium(uuid, boolean, text) from public;
grant execute on function public.admin_set_premium(uuid, boolean, text) to authenticated;
