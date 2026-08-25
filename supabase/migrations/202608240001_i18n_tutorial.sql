-- Preferencias ligeras asociadas a la cuenta: idioma y tutorial inicial.

alter table public.profiles
  add column if not exists locale text not null default 'es'
  check (locale in ('es', 'en'));

alter table public.profiles
  add column if not exists tutorial_completed boolean not null default false;

create or replace function public.get_account_preferences()
returns table (locale text, tutorial_completed boolean)
language sql stable security definer set search_path = public
as $$
  select p.locale, p.tutorial_completed
  from public.profiles p
  where p.user_id = auth.uid();
$$;

revoke all on function public.get_account_preferences() from public;
grant execute on function public.get_account_preferences() to authenticated;

create or replace function public.update_account_preferences(
  next_locale text default null,
  next_tutorial_completed boolean default null
)
returns table (locale text, tutorial_completed boolean)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if next_locale is not null and next_locale not in ('es', 'en') then raise exception 'unsupported locale'; end if;

  update public.profiles p set
    locale = coalesce(next_locale, p.locale),
    tutorial_completed = coalesce(next_tutorial_completed, p.tutorial_completed),
    updated_at = now()
  where p.user_id = auth.uid();

  return query select p.locale, p.tutorial_completed
  from public.profiles p where p.user_id = auth.uid();
end;
$$;

revoke all on function public.update_account_preferences(text, boolean) from public;
grant execute on function public.update_account_preferences(text, boolean) to authenticated;
