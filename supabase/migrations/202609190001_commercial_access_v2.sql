-- My Best Version: acceso comercial Gratis/Premium v2.
-- Migración forward-only. No inicia trials al registrarse y no reescribe la
-- evidencia histórica: los trials legacy vigentes conservan sus fechas.

begin;

create extension if not exists pgcrypto;

alter table public.profiles drop constraint if exists profiles_access_status_check;
alter table public.profiles add constraint profiles_access_status_check check (access_status in (
  'free','eligible','pending_activation','trial_active','trial_expired',
  'paid_monthly','paid_annual','payment_pending','payment_failed',
  'cancellation_scheduled','subscription_ended','legacy_premium','blocked',
  'trial','active','expired'
));

alter table public.profiles drop constraint if exists profiles_subscription_status_check;
alter table public.profiles add constraint profiles_subscription_status_check check (subscription_status in (
  'none','pending','active','past_due','failed','cancel_at_period_end','cancelled','ended'
));

alter table public.profiles
  add column if not exists access_status_changed_at timestamptz not null default now();

-- Conserva Premium y trials anteriores; una cuenta que nunca inició trial pasa
-- a Gratis. No se infieren fechas ni participación histórica.
update public.profiles p set
  access_status = case
    when p.role = 'superadmin' then 'active'
    when p.access_status = 'blocked' then 'blocked'
    when p.access_status in ('active','legacy_premium') then 'legacy_premium'
    when p.trial_started_at is not null and p.trial_ends_at > now() then 'trial'
    when p.trial_started_at is not null and p.trial_ends_at is not null then 'trial_expired'
    when p.subscription_status = 'pending' then 'payment_pending'
    else 'free'
  end,
  access_status_changed_at = now(),
  updated_at = now();

create table public.commercial_campaigns (
  campaign_key text primary key,
  required_consecutive_days integer not null check (required_consecutive_days between 1 and 365),
  trial_days integer not null check (trial_days between 1 and 365),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

insert into public.commercial_campaigns(campaign_key,required_consecutive_days,trial_days,active)
values ('consistency-30-v1',30,30,true)
on conflict(campaign_key) do update set
  required_consecutive_days=excluded.required_consecutive_days,
  trial_days=excluded.trial_days;

create table public.commercial_campaign_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_key text not null references public.commercial_campaigns(campaign_key),
  fixed_timezone text not null,
  current_streak_days integer not null default 0 check (current_streak_days >= 0),
  best_streak_days integer not null default 0 check (best_streak_days >= 0),
  last_local_date date,
  first_recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,campaign_key)
);

create table public.commercial_daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_key text not null references public.commercial_campaigns(campaign_key),
  local_date date not null,
  fixed_timezone text not null,
  action_type text not null check (action_type in (
    'vision_updated','goal_created','goal_updated','habit_recorded',
    'daily_action_created','daily_action_updated','daily_action_completed'
  )),
  recorded_at timestamptz not null default now(),
  constraint commercial_daily_activity_one_day unique(user_id,campaign_key,local_date),
  foreign key(user_id,campaign_key)
    references public.commercial_campaign_progress(user_id,campaign_key) on delete cascade
);

create table public.commercial_trial_eligibility (
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_key text not null references public.commercial_campaigns(campaign_key),
  status text not null check (status in ('eligible','activated','conflict_paid_premium')),
  qualified_period_started_on date not null,
  qualified_period_ended_on date not null,
  qualified_at timestamptz not null default now(),
  conflict_reason text,
  revalidated_at timestamptz,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,campaign_key),
  foreign key(user_id,campaign_key)
    references public.commercial_campaign_progress(user_id,campaign_key) on delete cascade,
  check (qualified_period_ended_on >= qualified_period_started_on),
  check ((status = 'conflict_paid_premium') = (conflict_reason is not null))
);

create table public.commercial_trial_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_key text not null references public.commercial_campaigns(campaign_key),
  activated_by uuid not null references auth.users(id),
  activation_reason text not null default '30_consecutive_participation_days',
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,campaign_key),
  foreign key(user_id,campaign_key)
    references public.commercial_trial_eligibility(user_id,campaign_key),
  check (trial_ends_at = trial_started_at + interval '30 days')
);

create table public.commercial_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_reference text not null unique default ('mbv_' || replace(gen_random_uuid()::text,'-','')),
  plan_interval text not null check (plan_interval in ('monthly','annual')),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'created' check (status in (
    'created','provider_pending','ready','completed','failed','expired','cancelled'
  )),
  provider text not null default 'mercado_pago' check (provider in ('mercado_pago')),
  provider_subscription_id text,
  provider_status text,
  provider_updated_at timestamptz,
  provider_terminal_confirmed_at timestamptz,
  checkout_url text,
  claim_token uuid,
  claim_expires_at timestamptz,
  claim_attempts integer not null default 0 check (claim_attempts >= 0),
  last_error_code text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((claim_token is null) = (claim_expires_at is null)),
  check (checkout_url is null or checkout_url ~ '^https://'),
  check (last_error_code is null or last_error_code ~ '^[A-Z0-9_]{1,80}$')
);

create unique index commercial_checkout_provider_subscription_uidx
  on public.commercial_checkout_intents(provider,provider_subscription_id)
  where provider_subscription_id is not null;
create index commercial_checkout_open_idx
  on public.commercial_checkout_intents(user_id,plan_interval,created_at desc)
  where status in ('created','provider_pending','ready');
create unique index commercial_checkout_one_open_uidx
  on public.commercial_checkout_intents(user_id)
  where status in ('created','provider_pending','ready');

create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkout_intent_id uuid references public.commercial_checkout_intents(id),
  provider text not null check (provider in ('mercado_pago')),
  provider_customer_id text,
  provider_subscription_id text not null,
  plan_interval text not null check (plan_interval in ('monthly','annual')),
  status text not null check (status in (
    'pending','active','past_due','cancel_at_period_end','cancelled','ended'
  )),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_payment_at timestamptz,
  cancel_at_period_end boolean not null default false,
  provider_updated_at timestamptz not null,
  cancelled_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,provider_subscription_id),
  unique(checkout_intent_id),
  check (current_period_end is null or current_period_start is null or current_period_end > current_period_start)
);

create index billing_subscriptions_user_status_idx
  on public.billing_subscriptions(user_id,status,current_period_end desc);
create unique index billing_subscriptions_one_current_uidx
  on public.billing_subscriptions(user_id)
  where status in ('pending','active','past_due','cancel_at_period_end');

create table public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkout_intent_id uuid references public.commercial_checkout_intents(id),
  subscription_id uuid references public.billing_subscriptions(id),
  provider text not null check (provider in ('mercado_pago')),
  provider_payment_id text not null,
  status text not null check (status in ('pending','approved','failed','refunded','cancelled')),
  status_detail text,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  provider_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,provider_payment_id),
  check (period_end is null or period_start is null or period_end > period_start)
);

create index billing_payments_user_status_idx
  on public.billing_payments(user_id,status,provider_updated_at desc);

create table public.billing_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercado_pago' check (provider in ('mercado_pago')),
  provider_event_id text not null,
  event_type text not null,
  resource_id text,
  provider_occurred_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'processing' check (processing_status in (
    'processing','processed','ignored','failed'
  )),
  lease_expires_at timestamptz,
  attempt_count integer not null default 1 check (attempt_count > 0),
  result_code text,
  user_id uuid references auth.users(id) on delete set null,
  checkout_intent_id uuid references public.commercial_checkout_intents(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(provider,provider_event_id),
  check (octet_length(payload::text) <= 262144),
  check (result_code is null or result_code ~ '^[A-Z0-9_]{1,80}$')
);

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'commercial_trial_eligible','commercial_trial_paid_conflict','commercial_trial_activated'
  )),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_key text references public.commercial_campaigns(campaign_key),
  status text not null default 'unread' check (status in ('unread','read','actioned','dismissed')),
  dedupe_key text not null unique,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  actioned_at timestamptz,
  actioned_by uuid references auth.users(id),
  check (octet_length(summary::text) <= 8192)
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  recipient_kind text not null check (recipient_kind in ('user','admin')),
  recipient_email text not null check (recipient_email ~* '^[^@[:space:]]+@[^@[:space:]]+$'),
  template_key text not null check (template_key in (
    'commercial_eligibility_admin','commercial_trial_activated','commercial_trial_ended',
    'premium_welcome','subscription_renewed','renewal_payment_requested','renewal_pending',
    'payment_failed','subscription_cancelled'
  )),
  dedupe_key text not null unique,
  template_data jsonb not null default '{}'::jsonb,
  status text not null default 'generated' check (status in (
    'generated','queued','accepted','delivered','failed','superseded'
  )),
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  claim_token uuid,
  claim_expires_at timestamptz,
  next_attempt_at timestamptz,
  last_error_code text,
  accepted_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (octet_length(template_data::text) <= 16384),
  check ((claim_token is null) = (claim_expires_at is null)),
  check (last_error_code is null or last_error_code ~ '^[A-Z0-9_]{1,80}$')
);

create index email_outbox_delivery_idx
  on public.email_outbox(status,next_attempt_at,created_at)
  where status in ('generated','queued','failed');

alter table public.commercial_campaigns enable row level security;
alter table public.commercial_campaign_progress enable row level security;
alter table public.commercial_daily_activity enable row level security;
alter table public.commercial_trial_eligibility enable row level security;
alter table public.commercial_trial_grants enable row level security;
alter table public.commercial_checkout_intents enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_provider_events enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.email_outbox enable row level security;

create policy commercial_campaigns_authenticated_read on public.commercial_campaigns
  for select to authenticated using (active);
create policy commercial_progress_self_or_admin_read on public.commercial_campaign_progress
  for select to authenticated using (user_id=auth.uid() or public.is_superadmin());
create policy commercial_activity_self_or_admin_read on public.commercial_daily_activity
  for select to authenticated using (user_id=auth.uid() or public.is_superadmin());
create policy commercial_eligibility_self_or_admin_read on public.commercial_trial_eligibility
  for select to authenticated using (user_id=auth.uid() or public.is_superadmin());
create policy commercial_grants_self_or_admin_read on public.commercial_trial_grants
  for select to authenticated using (user_id=auth.uid() or public.is_superadmin());
create policy checkout_intents_self_or_admin_read on public.commercial_checkout_intents
  for select to authenticated using (user_id=auth.uid() or public.is_superadmin());
create policy billing_subscriptions_self_or_admin_read on public.billing_subscriptions
  for select to authenticated using (user_id=auth.uid() or public.is_superadmin());
create policy billing_payments_self_or_admin_read on public.billing_payments
  for select to authenticated using (user_id=auth.uid() or public.is_superadmin());
create policy admin_notifications_admin_read on public.admin_notifications
  for select to authenticated using (public.is_superadmin());
create policy email_outbox_admin_read on public.email_outbox
  for select to authenticated using (public.is_superadmin());

revoke all on table public.commercial_campaigns,
  public.commercial_campaign_progress,public.commercial_daily_activity,
  public.commercial_trial_eligibility,public.commercial_trial_grants,
  public.commercial_checkout_intents,public.billing_subscriptions,
  public.billing_payments,public.billing_provider_events,
  public.admin_notifications,public.email_outbox from anon,authenticated;

grant select on table public.commercial_campaigns,
  public.commercial_campaign_progress,public.commercial_daily_activity,
  public.commercial_trial_eligibility,public.commercial_trial_grants,
  public.commercial_checkout_intents,public.billing_subscriptions,
  public.billing_payments to authenticated;
grant select on table public.admin_notifications,public.email_outbox to authenticated;

-- Helper interno. `legacy_premium` se considera conflicto conservador porque no
-- existe evidencia suficiente para degradar ese acceso histórico.
create or replace function public.has_paid_premium(target_user_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$
  select exists(
    select 1 from public.billing_subscriptions s
    where s.user_id=target_user_id
      and s.status in ('active','cancel_at_period_end','past_due')
      and (s.current_period_end is null or s.current_period_end>now())
      and exists(
        select 1 from public.billing_payments bp
        where bp.subscription_id=s.id and bp.paid_at is not null
      )
  ) or exists(
    select 1 from public.profiles p
    where p.user_id=target_user_id
      and p.access_status in ('legacy_premium','active')
      and p.role<>'superadmin'
  );
$$;
revoke all on function public.has_paid_premium(uuid) from public,anon,authenticated;

-- Las cuentas nuevas comienzan en Gratis; se conserva la inicialización de
-- preferencias de marketing ya existente y nunca se asigna rol por correo.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  insert into public.profiles(user_id,email,display_name,role,access_status,subscription_status)
  values(
    new.id,
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1)),
    'user','free','none'
  ) on conflict(user_id) do nothing;
  insert into public.marketing_preferences(user_id,email_marketing_consent,consent_source)
  values(new.id,false,'account_created') on conflict(user_id) do nothing;
  return new;
end;
$$;

create or replace function public.set_admin_notification_email(p_email text)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare normalized_email text := lower(trim(coalesce(p_email,'')));
begin
  if normalized_email='' then
    delete from public.platform_settings s where s.key='admin_notification_email';
    return;
  end if;
  if normalized_email !~* '^[^@[:space:]]+@[^@[:space:]]+$' or length(normalized_email)>320 then
    raise exception 'INVALID_ADMIN_NOTIFICATION_EMAIL';
  end if;
  insert into public.platform_settings(key,value,description,updated_by,updated_at)
  values(
    'admin_notification_email',to_jsonb(normalized_email),
    'Operational recipient for commercial eligibility alerts.',null,statement_timestamp()
  ) on conflict(key) do update set
    value=excluded.value,description=excluded.description,
    updated_by=null,updated_at=excluded.updated_at;
end;
$$;
revoke all on function public.set_admin_notification_email(text)
  from public,anon,authenticated;
grant execute on function public.set_admin_notification_email(text) to service_role;

create or replace function public.record_commercial_activity(next_action_type text)
returns table(
  local_date date,
  fixed_timezone text,
  counted boolean,
  streak_days integer,
  eligibility_status text,
  access_status text,
  period_started_on date,
  period_ended_on date
)
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare
  current_id uuid := auth.uid();
  active_campaign constant text := 'consistency-30-v1';
  server_event_at timestamptz := statement_timestamp();
  timezone_name text;
  profile_email text;
  profile_name text;
  server_local_date date;
  inserted_rows integer := 0;
  calculated_streak integer := 0;
  required_days integer;
  eligibility_state text;
  profile_status text;
  qualified_start date;
  qualified_end date;
  paid_conflict boolean;
  admin_email text;
begin
  if current_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if next_action_type is null or next_action_type not in (
    'vision_updated','goal_created','goal_updated','habit_recorded',
    'daily_action_created','daily_action_updated','daily_action_completed'
  ) then
    raise exception 'INVALID_COMMERCIAL_ACTION';
  end if;
  if not exists(select 1 from auth.users u where u.id=current_id and u.email_confirmed_at is not null) then
    raise exception 'VERIFIED_EMAIL_REQUIRED';
  end if;

  -- Toda mutación comercial de una cuenta comparte esta llave de 64 bits.
  -- Así la elegibilidad no puede observar un pago a medio conciliar.
  perform pg_advisory_xact_lock(hashtextextended(current_id::text,202609190001));

  select p.timezone,p.email,p.display_name into timezone_name,profile_email,profile_name
  from public.profiles p where p.user_id=current_id for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  if not exists(select 1 from pg_timezone_names z where z.name=timezone_name) then
    timezone_name := 'America/Bogota';
  end if;

  insert into public.commercial_campaign_progress(user_id,campaign_key,fixed_timezone,first_recorded_at,updated_at)
  values(current_id,active_campaign,timezone_name,server_event_at,server_event_at)
  on conflict(user_id,campaign_key) do nothing;

  select cp.fixed_timezone into timezone_name
  from public.commercial_campaign_progress cp
  where cp.user_id=current_id and cp.campaign_key=active_campaign
  for update;
  server_local_date := (server_event_at at time zone timezone_name)::date;

  select c.required_consecutive_days into required_days
  from public.commercial_campaigns c
  where c.campaign_key=active_campaign and c.active
    and c.starts_at<=server_event_at
    and (c.ends_at is null or c.ends_at>server_event_at);
  if required_days is null then raise exception 'COMMERCIAL_CAMPAIGN_NOT_ACTIVE'; end if;

  insert into public.commercial_daily_activity(
    user_id,campaign_key,local_date,fixed_timezone,action_type,recorded_at
  ) values (
    current_id,active_campaign,server_local_date,timezone_name,next_action_type,server_event_at
  ) on conflict on constraint commercial_daily_activity_one_day do nothing;
  get diagnostics inserted_rows=row_count;

  with ordered_days as (
    select a.local_date,row_number() over(order by a.local_date desc) as position
    from public.commercial_daily_activity a
    where a.user_id=current_id and a.campaign_key=active_campaign
      and a.local_date<=server_local_date
  )
  select count(*)::integer into calculated_streak
  from ordered_days d
  where d.local_date=server_local_date-((d.position-1)::integer);

  update public.commercial_campaign_progress cp set
    current_streak_days=calculated_streak,
    best_streak_days=greatest(cp.best_streak_days,calculated_streak),
    last_local_date=server_local_date,
    updated_at=server_event_at
  where cp.user_id=current_id and cp.campaign_key=active_campaign;

  if calculated_streak>=required_days then
    qualified_start := server_local_date-(required_days-1);
    qualified_end := server_local_date;
    paid_conflict := public.has_paid_premium(current_id);

    insert into public.commercial_trial_eligibility(
      user_id,campaign_key,status,qualified_period_started_on,
      qualified_period_ended_on,qualified_at,conflict_reason,updated_at
    ) values (
      current_id,active_campaign,
      case when paid_conflict then 'conflict_paid_premium' else 'eligible' end,
      qualified_start,qualified_end,server_event_at,
      case when paid_conflict then 'paid_premium_already_active' else null end,
      server_event_at
    ) on conflict(user_id,campaign_key) do nothing;

    select e.status,e.qualified_period_started_on,e.qualified_period_ended_on
      into eligibility_state,qualified_start,qualified_end
    from public.commercial_trial_eligibility e
    where e.user_id=current_id and e.campaign_key=active_campaign;

    if eligibility_state='conflict_paid_premium'
      and not public.has_paid_premium(current_id)
      and not exists(
        select 1 from public.billing_subscriptions s
        where s.user_id=current_id
          and s.status in ('pending','active','past_due','cancel_at_period_end')
      )
      and not exists(
        select 1 from public.commercial_trial_grants g
        where g.user_id=current_id and g.campaign_key=active_campaign
      ) then
      update public.commercial_trial_eligibility e set
        status='eligible',conflict_reason=null,revalidated_at=server_event_at,
        updated_at=server_event_at
      where e.user_id=current_id and e.campaign_key=active_campaign
        and e.status='conflict_paid_premium';
      eligibility_state := 'eligible';
    end if;

    if eligibility_state='eligible' then
      update public.profiles p set
        access_status=case
          when p.access_status in ('free','eligible','pending_activation','trial_expired','expired','subscription_ended')
          then 'pending_activation' else p.access_status end,
        access_status_changed_at=case
          when p.access_status in ('free','eligible','trial_expired','expired','subscription_ended')
          then server_event_at else p.access_status_changed_at end,
        updated_at=server_event_at
      where p.user_id=current_id;

      insert into public.admin_notifications(kind,user_id,campaign_key,dedupe_key,summary)
      values(
        'commercial_trial_eligible',current_id,active_campaign,
        'commercial_trial_eligible:'||active_campaign||':'||current_id::text,
        jsonb_build_object(
          'period_started_on',qualified_start,
          'period_ended_on',qualified_end,
          'consecutive_days',required_days,
          'timezone',timezone_name
        )
      ) on conflict(dedupe_key) do nothing;

      select nullif(trim(s.value #>> '{}'),'') into admin_email
      from public.platform_settings s where s.key='admin_notification_email';
      if admin_email ~* '^[^@[:space:]]+@[^@[:space:]]+$' then
        insert into public.email_outbox(
          user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,status
        ) values (
          current_id,'admin',admin_email,'commercial_eligibility_admin',
          'commercial_eligibility_admin:'||active_campaign||':'||current_id::text,
          jsonb_build_object(
            'user_id',current_id,
            'user_email',profile_email,
            'user_name',profile_name,
            'campaign_key',active_campaign,
            'eligible_at',server_event_at,
            'period_started_on',qualified_start,
            'period_ended_on',qualified_end
          ),'generated'
        ) on conflict(dedupe_key) do nothing;
      end if;
    elsif eligibility_state='conflict_paid_premium' then
      insert into public.admin_notifications(kind,user_id,campaign_key,dedupe_key,summary)
      values(
        'commercial_trial_paid_conflict',current_id,active_campaign,
        'commercial_trial_paid_conflict:'||active_campaign||':'||current_id::text,
        jsonb_build_object(
          'reason','paid_premium_already_active',
          'period_started_on',qualified_start,
          'period_ended_on',qualified_end
        )
      ) on conflict(dedupe_key) do nothing;
    end if;
  end if;

  select e.status,e.qualified_period_started_on,e.qualified_period_ended_on
    into eligibility_state,qualified_start,qualified_end
  from public.commercial_trial_eligibility e
  where e.user_id=current_id and e.campaign_key=active_campaign;
  select p.access_status into profile_status from public.profiles p where p.user_id=current_id;

  return query select
    server_local_date,timezone_name,(inserted_rows=1),calculated_streak,
    coalesce(eligibility_state,'tracking'),profile_status,qualified_start,qualified_end;
end;
$$;
revoke all on function public.record_commercial_activity(text) from public,anon;
grant execute on function public.record_commercial_activity(text) to authenticated;

create or replace function public.admin_activate_commercial_trial(
  target_user_id uuid,
  target_campaign_key text,
  confirmation text
)
returns table(
  outcome text,
  user_id uuid,
  campaign_key text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  access_status text
)
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare
  admin_id uuid := auth.uid();
  activation_time timestamptz := statement_timestamp();
  expires_at timestamptz := activation_time+interval '30 days';
  previous_status text;
  eligibility_state text;
  existing_grant public.commercial_trial_grants%rowtype;
  target_email text;
begin
  if not public.is_superadmin(admin_id) then raise exception 'SUPERADMIN_REQUIRED'; end if;
  if confirmation is distinct from 'ACTIVAR_TRIAL_30_DIAS' then raise exception 'EXPLICIT_CONFIRMATION_REQUIRED'; end if;
  if target_campaign_key is distinct from 'consistency-30-v1' then raise exception 'INVALID_COMMERCIAL_CAMPAIGN'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text,202609190001));

  select p.access_status,p.email into previous_status,target_email
  from public.profiles p where p.user_id=target_user_id for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  select e.status into eligibility_state
  from public.commercial_trial_eligibility e
  where e.user_id=target_user_id and e.campaign_key=target_campaign_key
  for update;
  if not found then raise exception 'ACCOUNT_NOT_ELIGIBLE'; end if;

  select g.* into existing_grant
  from public.commercial_trial_grants g
  where g.user_id=target_user_id and g.campaign_key=target_campaign_key
  for update;
  if found then
    return query select
      'already_activated'::text,target_user_id,target_campaign_key,
      existing_grant.trial_started_at,existing_grant.trial_ends_at,
      (select p.access_status from public.profiles p where p.user_id=target_user_id);
    return;
  end if;

  if public.has_paid_premium(target_user_id) then
    update public.commercial_trial_eligibility e set
      status='conflict_paid_premium',conflict_reason='paid_premium_already_active',
      revalidated_at=null,updated_at=activation_time
    where e.user_id=target_user_id and e.campaign_key=target_campaign_key;
    insert into public.admin_notifications(kind,user_id,campaign_key,dedupe_key,summary)
    values(
      'commercial_trial_paid_conflict',target_user_id,target_campaign_key,
      'commercial_trial_paid_conflict:'||target_campaign_key||':'||target_user_id::text,
      jsonb_build_object('reason','paid_premium_already_active','detected_at',activation_time)
    ) on conflict(dedupe_key) do nothing;
    insert into public.access_audit_log(
      actor_user_id,target_user_id,action,previous_access_status,next_access_status,note
    ) values (
      admin_id,target_user_id,'commercial_trial_conflict',previous_status,previous_status,
      'Paid Premium already active; promotional trial not granted.'
    );
    return query select
      'conflict_paid_premium'::text,target_user_id,target_campaign_key,
      null::timestamptz,null::timestamptz,previous_status;
    return;
  end if;

  -- Un checkout o una suscripción aún en curso tiene prioridad sobre el
  -- beneficio promocional. El admin podrá reintentar tras su cierre seguro.
  if exists(
    select 1 from public.commercial_checkout_intents i
    where i.user_id=target_user_id and i.status in ('created','provider_pending','ready')
  ) or exists(
    select 1 from public.billing_subscriptions s
    where s.user_id=target_user_id
      and s.status in ('pending','active','past_due','cancel_at_period_end')
  ) then
    raise exception 'BILLING_CHECKOUT_IN_PROGRESS';
  end if;

  if eligibility_state='conflict_paid_premium' then
    update public.commercial_trial_eligibility e set
      status='eligible',conflict_reason=null,revalidated_at=activation_time,
      updated_at=activation_time
    where e.user_id=target_user_id and e.campaign_key=target_campaign_key
      and e.status='conflict_paid_premium';
    eligibility_state := 'eligible';
  end if;

  if eligibility_state<>'eligible' then raise exception 'ACCOUNT_NOT_ELIGIBLE'; end if;

  insert into public.commercial_trial_grants(
    user_id,campaign_key,activated_by,trial_started_at,trial_ends_at,status,created_at,updated_at
  ) values (
    target_user_id,target_campaign_key,admin_id,activation_time,expires_at,'active',activation_time,activation_time
  );
  update public.commercial_trial_eligibility e set
    status='activated',activated_at=activation_time,conflict_reason=null,updated_at=activation_time
  where e.user_id=target_user_id and e.campaign_key=target_campaign_key;
  update public.profiles p set
    access_status='trial_active',subscription_status='none',
    trial_started_at=activation_time,trial_ends_at=expires_at,
    access_status_changed_at=activation_time,updated_at=activation_time
  where p.user_id=target_user_id;
  update public.admin_notifications n set
    status='actioned',actioned_at=activation_time,actioned_by=admin_id
  where n.user_id=target_user_id and n.campaign_key=target_campaign_key
    and n.kind='commercial_trial_eligible' and n.status in ('unread','read');
  insert into public.admin_notifications(kind,user_id,campaign_key,status,dedupe_key,summary,actioned_at,actioned_by)
  values(
    'commercial_trial_activated',target_user_id,target_campaign_key,'actioned',
    'commercial_trial_activated:'||target_campaign_key||':'||target_user_id::text,
    jsonb_build_object('trial_started_at',activation_time,'trial_ends_at',expires_at),
    activation_time,admin_id
  ) on conflict(dedupe_key) do nothing;
  insert into public.access_audit_log(
    actor_user_id,target_user_id,action,previous_access_status,next_access_status,note
  ) values (
    admin_id,target_user_id,'commercial_trial_activated',previous_status,'trial_active',
    'Single 30-day promotional Premium grant after verified eligibility.'
  );
  if target_email ~* '^[^@[:space:]]+@[^@[:space:]]+$' then
    insert into public.email_outbox(
      user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,status
    ) values (
      target_user_id,'user',target_email,'commercial_trial_activated',
      'commercial_trial_activated:'||target_campaign_key||':'||target_user_id::text,
      jsonb_build_object('trial_started_at',activation_time,'trial_ends_at',expires_at),'generated'
    ) on conflict(dedupe_key) do nothing;
  end if;

  return query select
    'activated'::text,target_user_id,target_campaign_key,
    activation_time,expires_at,'trial_active'::text;
end;
$$;
revoke all on function public.admin_activate_commercial_trial(uuid,text,text) from public,anon;
grant execute on function public.admin_activate_commercial_trial(uuid,text,text) to authenticated;

drop function if exists public.ensure_user_access();
create function public.ensure_user_access()
returns table(
  user_id uuid,
  email text,
  display_name text,
  role text,
  access_status text,
  subscription_status text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  server_now timestamptz,
  eligibility_status text,
  plan_interval text,
  premium_source text,
  campaign_key text,
  current_streak_days integer,
  eligible_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  next_payment_at timestamptz,
  cancel_at_period_end boolean
)
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare
  current_id uuid := auth.uid();
  checked_at timestamptz := statement_timestamp();
  profile_row public.profiles%rowtype;
  subscription_row public.billing_subscriptions%rowtype;
  grant_row public.commercial_trial_grants%rowtype;
  eligibility_row public.commercial_trial_eligibility%rowtype;
  streak integer := 0;
  effective_status text;
  effective_subscription_status text;
  effective_source text;
  effective_plan text;
begin
  if current_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not exists(select 1 from auth.users u where u.id=current_id and u.email_confirmed_at is not null) then
    raise exception 'VERIFIED_EMAIL_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_id::text,202609190001));

  select p.* into profile_row from public.profiles p where p.user_id=current_id for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  select g.* into grant_row
  from public.commercial_trial_grants g
  where g.user_id=current_id and g.campaign_key='consistency-30-v1'
  for update;
  if found and grant_row.status='active' and grant_row.trial_ends_at<=checked_at then
    update public.commercial_trial_grants g set status='expired',updated_at=checked_at
    where g.id=grant_row.id;
    grant_row.status := 'expired';
    if profile_row.email ~* '^[^@[:space:]]+@[^@[:space:]]+$'
      and not public.has_paid_premium(current_id) then
      insert into public.email_outbox(
        user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,status
      ) values (
        current_id,'user',profile_row.email,'commercial_trial_ended',
        'commercial_trial_ended:'||grant_row.id::text,
        jsonb_build_object('trial_ended_at',grant_row.trial_ends_at),'generated'
      ) on conflict(dedupe_key) do nothing;
    end if;
  end if;

  select s.* into subscription_row
  from public.billing_subscriptions s
  where s.user_id=current_id
  order by
    case s.status
      when 'active' then 1 when 'cancel_at_period_end' then 2 when 'past_due' then 3
      when 'pending' then 4 when 'cancelled' then 5 else 6 end,
    coalesce(s.current_period_end,'infinity'::timestamptz) desc,
    s.provider_updated_at desc
  limit 1;

  select e.* into eligibility_row
  from public.commercial_trial_eligibility e
  where e.user_id=current_id and e.campaign_key='consistency-30-v1';
  if eligibility_row.status='conflict_paid_premium'
    and not public.has_paid_premium(current_id)
    and not exists(
      select 1 from public.billing_subscriptions s
      where s.user_id=current_id
        and s.status in ('pending','active','past_due','cancel_at_period_end')
    )
    and grant_row.id is null then
    update public.commercial_trial_eligibility e set
      status='eligible',conflict_reason=null,revalidated_at=checked_at,updated_at=checked_at
    where e.user_id=current_id and e.campaign_key='consistency-30-v1'
      and e.status='conflict_paid_premium';
    eligibility_row.status := 'eligible';
    eligibility_row.conflict_reason := null;
    eligibility_row.revalidated_at := checked_at;
  end if;
  select coalesce(cp.current_streak_days,0) into streak
  from public.commercial_campaign_progress cp
  where cp.user_id=current_id and cp.campaign_key='consistency-30-v1';
  streak := coalesce(streak,0);

  effective_subscription_status := coalesce(subscription_row.status,profile_row.subscription_status,'none');
  effective_plan := subscription_row.plan_interval;
  effective_source := null;

  if profile_row.role='superadmin' then
    effective_status := 'active';
    effective_source := 'superadmin';
  elsif profile_row.access_status='blocked' then
    effective_status := 'blocked';
  elsif subscription_row.id is not null
    and subscription_row.status in ('active','cancel_at_period_end','past_due')
    and (subscription_row.current_period_end is null or subscription_row.current_period_end>checked_at)
    and exists(
      select 1 from public.billing_payments bp
      where bp.subscription_id=subscription_row.id and bp.paid_at is not null
    ) then
    effective_status := case
      when subscription_row.status='cancel_at_period_end' or subscription_row.cancel_at_period_end
        then 'cancellation_scheduled'
      when subscription_row.plan_interval='annual' then 'paid_annual'
      else 'paid_monthly' end;
    effective_source := 'paid_subscription';
  elsif grant_row.id is not null and grant_row.status='active' and grant_row.trial_ends_at>checked_at then
    effective_status := 'trial_active';
    effective_source := 'promotional_trial';
  elsif profile_row.access_status='trial' and profile_row.trial_ends_at>checked_at then
    effective_status := 'trial';
    effective_source := 'legacy';
  elsif subscription_row.status='pending' then
    effective_status := 'payment_pending';
  elsif subscription_row.status='past_due' then
    effective_status := 'payment_failed';
  elsif eligibility_row.status='eligible' then
    effective_status := 'pending_activation';
  elsif eligibility_row.status='activated' or grant_row.status='expired' then
    effective_status := 'trial_expired';
  elsif subscription_row.status in ('cancelled','ended') then
    effective_status := 'subscription_ended';
  elsif profile_row.access_status in ('legacy_premium','active') then
    effective_status := 'legacy_premium';
    effective_source := 'legacy';
  elsif profile_row.access_status in ('trial_expired','expired') then
    effective_status := 'trial_expired';
  else
    effective_status := 'free';
  end if;

  update public.profiles p set
    access_status=effective_status,
    subscription_status=effective_subscription_status,
    access_status_changed_at=case
      when p.access_status is distinct from effective_status then checked_at
      else p.access_status_changed_at end,
    updated_at=case
      when p.access_status is distinct from effective_status
        or p.subscription_status is distinct from effective_subscription_status
      then checked_at else p.updated_at end
  where p.user_id=current_id;

  return query select
    profile_row.user_id,profile_row.email,profile_row.display_name,profile_row.role,
    effective_status,effective_subscription_status,
    case when grant_row.id is not null then grant_row.trial_started_at else profile_row.trial_started_at end,
    case when grant_row.id is not null then grant_row.trial_ends_at else profile_row.trial_ends_at end,
    checked_at,
    eligibility_row.status,effective_plan,effective_source,
    case when exists(
      select 1 from public.commercial_campaign_progress cp
      where cp.user_id=current_id and cp.campaign_key='consistency-30-v1'
    ) then 'consistency-30-v1'::text else null::text end,
    streak,eligibility_row.qualified_at,
    subscription_row.current_period_start,subscription_row.current_period_end,
    subscription_row.next_payment_at,
    coalesce(subscription_row.cancel_at_period_end,false);
end;
$$;
revoke all on function public.ensure_user_access() from public,anon;
grant execute on function public.ensure_user_access() to authenticated;

create or replace function public.get_my_commercial_plan()
returns table(
  user_id uuid,
  email text,
  display_name text,
  role text,
  access_status text,
  subscription_status text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  server_now timestamptz,
  eligibility_status text,
  plan_interval text,
  premium_source text,
  campaign_key text,
  current_streak_days integer,
  eligible_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  next_payment_at timestamptz,
  cancel_at_period_end boolean
)
language sql volatile security definer set search_path=public,auth,pg_temp
as $$ select * from public.ensure_user_access() $$;
revoke all on function public.get_my_commercial_plan() from public,anon;
grant execute on function public.get_my_commercial_plan() to authenticated;

create or replace function public.admin_list_commercial_access()
returns table(
  user_id uuid,
  email text,
  display_name text,
  role text,
  access_status text,
  subscription_status text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  eligibility_status text,
  eligible_at timestamptz,
  eligibility_period_started_on date,
  eligibility_period_ended_on date,
  campaign_key text,
  fixed_timezone text,
  current_streak_days integer,
  trial_granted_at timestamptz,
  plan_interval text,
  conflict_reason text,
  updated_at timestamptz
)
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
begin
  if not public.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED'; end if;
  return query
  select
    p.user_id,p.email,p.display_name,p.role,
    case
      when p.role='superadmin' then 'active'
      when p.access_status='blocked' then 'blocked'
      when (s.status='cancel_at_period_end' or coalesce(s.cancel_at_period_end,false))
        and (s.current_period_end is null or s.current_period_end>now())
        and exists(
          select 1 from public.billing_payments bp
          where bp.subscription_id=s.id and bp.paid_at is not null
        ) then 'cancellation_scheduled'
      when s.status in ('active','past_due')
        and (s.current_period_end is null or s.current_period_end>now())
        and exists(
          select 1 from public.billing_payments bp
          where bp.subscription_id=s.id and bp.paid_at is not null
        )
        then case when s.plan_interval='annual' then 'paid_annual' else 'paid_monthly' end
      when g.status='active' and g.trial_ends_at>now() then 'trial_active'
      when p.access_status='trial' and p.trial_ends_at>now() then 'trial'
      when s.status='pending' then 'payment_pending'
      when s.status='past_due' then 'payment_failed'
      when e.status='eligible'
        or (e.status='conflict_paid_premium' and g.id is null
          and not public.has_paid_premium(p.user_id)
          and not exists(
            select 1 from public.billing_subscriptions current_subscription
            where current_subscription.user_id=p.user_id
              and current_subscription.status in ('pending','active','past_due','cancel_at_period_end')
          )) then 'pending_activation'
      when e.status='activated' or g.status='expired' then 'trial_expired'
      when s.status in ('cancelled','ended') then 'subscription_ended'
      else p.access_status end,
    coalesce(s.status,p.subscription_status),
    coalesce(g.trial_started_at,p.trial_started_at),
    coalesce(g.trial_ends_at,p.trial_ends_at),
    case
      when e.status='conflict_paid_premium' and g.id is null
        and not public.has_paid_premium(p.user_id)
        and not exists(
          select 1 from public.billing_subscriptions current_subscription
          where current_subscription.user_id=p.user_id
            and current_subscription.status in ('pending','active','past_due','cancel_at_period_end')
        ) then 'eligible'
      else e.status end,
    e.qualified_at,e.qualified_period_started_on,e.qualified_period_ended_on,
    cp.campaign_key,cp.fixed_timezone,coalesce(cp.current_streak_days,0),
    g.created_at,s.plan_interval,
    case
      when e.status='conflict_paid_premium' and g.id is null
        and not public.has_paid_premium(p.user_id)
        and not exists(
          select 1 from public.billing_subscriptions current_subscription
          where current_subscription.user_id=p.user_id
            and current_subscription.status in ('pending','active','past_due','cancel_at_period_end')
        ) then null
      else e.conflict_reason end,
    p.updated_at
  from public.profiles p
  left join public.commercial_campaign_progress cp
    on cp.user_id=p.user_id and cp.campaign_key='consistency-30-v1'
  left join public.commercial_trial_eligibility e
    on e.user_id=p.user_id and e.campaign_key='consistency-30-v1'
  left join public.commercial_trial_grants g
    on g.user_id=p.user_id and g.campaign_key='consistency-30-v1'
  left join lateral (
    select candidate.* from public.billing_subscriptions candidate
    where candidate.user_id=p.user_id
    order by
      case candidate.status
        when 'active' then 1 when 'cancel_at_period_end' then 2 when 'past_due' then 3
        when 'pending' then 4 when 'cancelled' then 5 else 6 end,
      coalesce(candidate.current_period_end,'infinity'::timestamptz) desc,
      candidate.provider_updated_at desc
    limit 1
  ) s on true
  order by
    case
      when e.status='eligible'
        or (e.status='conflict_paid_premium' and g.id is null
          and not public.has_paid_premium(p.user_id)
          and not exists(
            select 1 from public.billing_subscriptions current_subscription
            where current_subscription.user_id=p.user_id
              and current_subscription.status in ('pending','active','past_due','cancel_at_period_end')
          )) then 0
      when e.status='conflict_paid_premium' then 1 else 2 end,
    coalesce(e.qualified_at,p.created_at) desc;
end;
$$;
revoke all on function public.admin_list_commercial_access() from public,anon;
grant execute on function public.admin_list_commercial_access() to authenticated;

create or replace function public.create_checkout_intent(next_plan text)
returns table(
  id uuid,
  plan text,
  amount_minor integer,
  currency text,
  status text,
  provider_subscription_id text,
  checkout_url text,
  claim_token uuid,
  claim_expires_at timestamptz
)
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare
  current_id uuid := auth.uid();
  expected_amount integer;
  current_intent public.commercial_checkout_intents%rowtype;
  issued_claim uuid;
  checked_at timestamptz := statement_timestamp();
begin
  if current_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if next_plan is null or next_plan not in ('monthly','annual') then raise exception 'INVALID_PLAN_INTERVAL'; end if;
  if not exists(select 1 from auth.users u where u.id=current_id and u.email_confirmed_at is not null) then
    raise exception 'VERIFIED_EMAIL_REQUIRED';
  end if;
  expected_amount := case when next_plan='monthly' then 299 else 2999 end;

  -- Un solo flujo de contratación por cuenta. Serializar por modalidad todavía
  -- permitiría crear dos preapprovals (mensual y anual) en paralelo.
  perform pg_advisory_xact_lock(hashtextextended(current_id::text,202609190001));
  if exists(
    select 1 from public.billing_subscriptions s
    where s.user_id=current_id
      and s.status in ('active','past_due','cancel_at_period_end')
  ) then
    raise exception 'BILLING_SUBSCRIPTION_ALREADY_EXISTS';
  end if;

  -- Sólo se expiran leases locales que nunca llegaron a asociarse al proveedor.
  -- Un checkout listo conserva su referencia hasta recibir estado canónico.
  update public.commercial_checkout_intents i set
    status='expired',claim_token=null,claim_expires_at=null,updated_at=checked_at
  where i.user_id=current_id and i.status in ('created','provider_pending')
    and i.expires_at<=checked_at
    and i.provider_subscription_id is null and i.checkout_url is null;

  select i.* into current_intent
  from public.commercial_checkout_intents i
  where i.user_id=current_id
    and i.status in ('created','provider_pending','ready')
    and (
      i.expires_at>checked_at
      or i.provider_subscription_id is not null
      or i.checkout_url is not null
    )
  order by i.created_at desc limit 1 for update;

  if found then
    if current_intent.plan_interval<>next_plan then
      raise exception 'CHECKOUT_ALREADY_OPEN';
    end if;
    if exists(
      select 1 from public.billing_subscriptions s
      where s.user_id=current_id and s.status='pending'
        and s.checkout_intent_id is distinct from current_intent.id
    ) then
      raise exception 'BILLING_SUBSCRIPTION_ALREADY_EXISTS';
    end if;
    issued_claim := null;
    if current_intent.checkout_url is null
      and (current_intent.claim_token is null or current_intent.claim_expires_at<=checked_at) then
      issued_claim := gen_random_uuid();
      update public.commercial_checkout_intents i set
        claim_token=issued_claim,
        claim_expires_at=checked_at+interval '5 minutes',
        claim_attempts=i.claim_attempts+1,
        last_error_code=null,
        updated_at=checked_at
      where i.id=current_intent.id
      returning i.* into current_intent;
    end if;
  else
    if exists(
      select 1 from public.billing_subscriptions s
      where s.user_id=current_id and s.status='pending'
    ) then
      raise exception 'BILLING_SUBSCRIPTION_ALREADY_EXISTS';
    end if;
    issued_claim := gen_random_uuid();
    insert into public.commercial_checkout_intents(
      user_id,plan_interval,amount_minor,currency,status,
      claim_token,claim_expires_at,claim_attempts,expires_at,created_at,updated_at
    ) values (
      current_id,next_plan,expected_amount,'USD','created',
      issued_claim,checked_at+interval '5 minutes',1,checked_at+interval '30 minutes',checked_at,checked_at
    ) returning * into current_intent;
  end if;

  return query select
    current_intent.id,current_intent.plan_interval,current_intent.amount_minor,
    current_intent.currency,current_intent.status,current_intent.provider_subscription_id,
    current_intent.checkout_url,issued_claim,
    case when issued_claim is not null then current_intent.claim_expires_at else null end;
end;
$$;
revoke all on function public.create_checkout_intent(text) from public,anon;
grant execute on function public.create_checkout_intent(text) to authenticated;

create or replace function public.complete_checkout_intent(
  p_intent_id uuid,
  p_claim_token uuid,
  p_provider_subscription_id text,
  p_checkout_url text,
  p_provider_status text,
  p_provider_updated_at timestamptz
)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := statement_timestamp();
  existing_intent public.commercial_checkout_intents%rowtype;
begin
  if p_provider_subscription_id is null or length(p_provider_subscription_id) not between 1 and 200 then
    raise exception 'INVALID_PROVIDER_SUBSCRIPTION_ID';
  end if;
  if p_checkout_url is null or p_checkout_url !~ '^https://' or length(p_checkout_url)>2000 then
    raise exception 'INVALID_CHECKOUT_URL';
  end if;
  if p_provider_status is null or p_provider_status !~ '^[A-Za-z0-9_.-]{1,80}$' then
    raise exception 'INVALID_PROVIDER_STATUS';
  end if;
  select i.* into existing_intent from public.commercial_checkout_intents i
  where i.id=p_intent_id for update;
  if not found then raise exception 'CHECKOUT_INTENT_NOT_FOUND'; end if;
  if existing_intent.provider_subscription_id=p_provider_subscription_id
    and existing_intent.checkout_url=p_checkout_url
    and existing_intent.status in ('ready','provider_pending','completed') then
    return;
  end if;
  update public.commercial_checkout_intents i set
    provider_subscription_id=p_provider_subscription_id,
    checkout_url=p_checkout_url,
    provider_status=p_provider_status,
    provider_updated_at=coalesce(p_provider_updated_at,checked_at),
    -- La URL queda reutilizable durante un plazo finito. Al vencer, un worker
    -- debe confirmar/cancelar el estado terminal en el proveedor antes de abrir
    -- otro checkout; nunca se libera por tiempo solamente.
    expires_at=greatest(i.expires_at,checked_at+interval '24 hours'),
    status='ready',claim_token=null,claim_expires_at=null,last_error_code=null,
    updated_at=checked_at
  where i.id=p_intent_id and i.claim_token=p_claim_token
    and i.claim_expires_at>checked_at and i.status in ('created','provider_pending');
  if not found then raise exception 'CHECKOUT_CLAIM_NOT_AVAILABLE'; end if;
end;
$$;
revoke all on function public.complete_checkout_intent(uuid,uuid,text,text,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.complete_checkout_intent(uuid,uuid,text,text,text,timestamptz)
  to service_role;

create or replace function public.release_checkout_intent(
  p_intent_id uuid,
  p_claim_token uuid,
  p_error_code text
)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if p_error_code is null or p_error_code !~ '^[A-Z0-9_]{1,80}$' then
    raise exception 'INVALID_ERROR_CODE';
  end if;
  update public.commercial_checkout_intents i set
    claim_token=null,claim_expires_at=null,last_error_code=p_error_code,
    status='created',updated_at=statement_timestamp()
  where i.id=p_intent_id and i.claim_token=p_claim_token
    and i.status in ('created','provider_pending');
  if not found then raise exception 'CHECKOUT_CLAIM_NOT_AVAILABLE'; end if;
end;
$$;
revoke all on function public.release_checkout_intent(uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.release_checkout_intent(uuid,uuid,text) to service_role;

-- Recuperación conservadora de checkouts abandonados. El caller debe consultar
-- (o cancelar) primero la preapproval en el proveedor y aportar un estado terminal
-- fresco. Esto permite cambiar de plan sin dejar dos autorizaciones cobrables.
create or replace function public.close_stale_checkout_intent(
  p_intent_id uuid,
  p_provider_subscription_id text,
  p_provider_status text,
  p_provider_updated_at timestamptz
)
returns table(intent_id uuid,status text)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := statement_timestamp();
  target_user_id uuid;
  intent_row public.commercial_checkout_intents%rowtype;
  terminal_status text;
begin
  if p_provider_subscription_id is null
    or length(trim(p_provider_subscription_id)) not between 1 and 200 then
    raise exception 'INVALID_PROVIDER_SUBSCRIPTION_ID';
  end if;
  terminal_status := case lower(trim(coalesce(p_provider_status,'')))
    when 'cancelled' then 'cancelled'
    when 'canceled' then 'cancelled'
    when 'ended' then 'cancelled'
    when 'terminated' then 'cancelled'
    when 'expired' then 'expired'
    when 'rejected' then 'failed'
    when 'failed' then 'failed'
    else null end;
  if terminal_status is null then raise exception 'CHECKOUT_PROVIDER_STATE_NOT_TERMINAL'; end if;
  if p_provider_updated_at is null or p_provider_updated_at>checked_at+interval '5 minutes' then
    raise exception 'INVALID_PROVIDER_UPDATED_AT';
  end if;

  select i.user_id into target_user_id
  from public.commercial_checkout_intents i where i.id=p_intent_id;
  if not found then raise exception 'CHECKOUT_INTENT_NOT_FOUND'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text,202609190001));
  select i.* into intent_row from public.commercial_checkout_intents i
  where i.id=p_intent_id for update;

  if intent_row.user_id is distinct from target_user_id then
    raise exception 'CHECKOUT_ACCOUNT_CHANGED';
  end if;
  if intent_row.provider_subscription_id is distinct from trim(p_provider_subscription_id) then
    raise exception 'CHECKOUT_PROVIDER_SUBSCRIPTION_MISMATCH';
  end if;
  if p_provider_updated_at<coalesce(intent_row.provider_updated_at,'epoch'::timestamptz) then
    raise exception 'STALE_PROVIDER_CHECKOUT_STATE';
  end if;
  if intent_row.status in ('failed','expired','cancelled') then
    return query select intent_row.id,intent_row.status;
    return;
  end if;
  if intent_row.status='completed' then raise exception 'CHECKOUT_ALREADY_COMPLETED'; end if;
  if intent_row.expires_at>checked_at then raise exception 'CHECKOUT_STILL_FRESH'; end if;
  if exists(
    select 1 from public.billing_payments bp
    where bp.checkout_intent_id=intent_row.id and bp.paid_at is not null
  ) then
    raise exception 'CHECKOUT_HAS_PAID_PAYMENT';
  end if;
  if exists(
    select 1 from public.billing_subscriptions s
    where s.checkout_intent_id=intent_row.id
      and s.status in ('active','past_due','cancel_at_period_end')
  ) then
    raise exception 'CHECKOUT_HAS_CURRENT_SUBSCRIPTION';
  end if;
  if exists(
    select 1 from public.billing_subscriptions s
    where s.checkout_intent_id=intent_row.id and s.status='pending'
      and s.provider_updated_at>p_provider_updated_at
  ) then
    raise exception 'STALE_PROVIDER_CHECKOUT_STATE';
  end if;

  update public.billing_subscriptions s set
    status='ended',cancel_at_period_end=false,ended_at=coalesce(s.ended_at,p_provider_updated_at),
    provider_updated_at=p_provider_updated_at,updated_at=checked_at
  where s.checkout_intent_id=intent_row.id and s.status='pending'
    and not exists(
      select 1 from public.billing_payments bp
      where bp.subscription_id=s.id and bp.paid_at is not null
    );

  update public.commercial_checkout_intents i set
    status=terminal_status,provider_status=lower(trim(p_provider_status)),
    provider_updated_at=p_provider_updated_at,provider_terminal_confirmed_at=checked_at,
    claim_token=null,claim_expires_at=null,
    updated_at=checked_at
  where i.id=intent_row.id;

  update public.profiles p set
    access_status=case
      when exists(
        select 1 from public.commercial_trial_grants g
        where g.user_id=p.user_id and g.status='active' and g.trial_ends_at>checked_at
      ) then 'trial_active'
      when exists(
        select 1 from public.commercial_trial_eligibility e
        where e.user_id=p.user_id and e.status='eligible'
      ) then 'pending_activation'
      else 'free' end,
    subscription_status='ended',access_status_changed_at=checked_at,updated_at=checked_at
  where p.user_id=target_user_id and p.access_status='payment_pending';

  return query select intent_row.id,terminal_status;
end;
$$;
revoke all on function public.close_stale_checkout_intent(uuid,text,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.close_stale_checkout_intent(uuid,text,text,timestamptz)
  to service_role;

create or replace function public.claim_billing_provider_event(
  p_provider_event_id text,
  p_event_type text,
  p_resource_id text,
  p_occurred_at timestamptz,
  p_payload jsonb
)
returns table(event_id uuid,claimed boolean,processing_status text)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := statement_timestamp();
  event_row public.billing_provider_events%rowtype;
begin
  if p_provider_event_id is null or length(p_provider_event_id) not between 1 and 200 then
    raise exception 'INVALID_PROVIDER_EVENT_ID';
  end if;
  if p_event_type is null or length(p_event_type) not between 1 and 120 then
    raise exception 'INVALID_PROVIDER_EVENT_TYPE';
  end if;
  if octet_length(coalesce(p_payload,'{}'::jsonb)::text)>262144 then
    raise exception 'PROVIDER_PAYLOAD_TOO_LARGE';
  end if;

  insert into public.billing_provider_events(
    provider_event_id,event_type,resource_id,provider_occurred_at,payload,
    processing_status,lease_expires_at,attempt_count,received_at,updated_at
  ) values (
    p_provider_event_id,p_event_type,left(p_resource_id,200),p_occurred_at,
    coalesce(p_payload,'{}'::jsonb),'processing',checked_at+interval '5 minutes',1,checked_at,checked_at
  ) on conflict(provider,provider_event_id) do nothing
  returning * into event_row;
  if found then
    return query select event_row.id,true,event_row.processing_status;
    return;
  end if;

  select e.* into event_row from public.billing_provider_events e
  where e.provider='mercado_pago' and e.provider_event_id=p_provider_event_id for update;
  if event_row.processing_status='failed'
    or (event_row.processing_status='processing' and event_row.lease_expires_at<=checked_at) then
    update public.billing_provider_events e set
      processing_status='processing',lease_expires_at=checked_at+interval '5 minutes',
      attempt_count=e.attempt_count+1,result_code=null,processed_at=null,updated_at=checked_at
    where e.id=event_row.id returning * into event_row;
    return query select event_row.id,true,event_row.processing_status;
  else
    return query select event_row.id,false,event_row.processing_status;
  end if;
end;
$$;
revoke all on function public.claim_billing_provider_event(text,text,text,timestamptz,jsonb)
  from public,anon,authenticated;
grant execute on function public.claim_billing_provider_event(text,text,text,timestamptz,jsonb)
  to service_role;

create or replace function public.fail_billing_provider_event(
  p_event_id uuid,
  p_error_code text
)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if p_error_code is null or p_error_code !~ '^[A-Z0-9_]{1,80}$' then
    raise exception 'INVALID_PROVIDER_EVENT_ERROR_CODE';
  end if;
  update public.billing_provider_events e set
    processing_status='failed',result_code=p_error_code,
    lease_expires_at=null,updated_at=statement_timestamp()
  where e.id=p_event_id and e.processing_status='processing';
end;
$$;
revoke all on function public.fail_billing_provider_event(uuid,text)
  from public,anon,authenticated;
grant execute on function public.fail_billing_provider_event(uuid,text) to service_role;

create or replace function public.reconcile_billing_event(
  p_event_id uuid,
  p_provider_subscription_id text,
  p_external_reference text,
  p_provider_payment_id text,
  p_subscription_status text,
  p_payment_status text,
  p_status_detail text,
  p_amount_minor integer,
  p_currency text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_next_payment_at timestamptz,
  p_provider_updated_at timestamptz,
  p_payload jsonb
)
returns table(applied boolean,result_code text,user_id uuid)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := statement_timestamp();
  provider_time timestamptz := coalesce(p_provider_updated_at,statement_timestamp());
  event_row public.billing_provider_events%rowtype;
  intent_row public.commercial_checkout_intents%rowtype;
  subscription_row public.billing_subscriptions%rowtype;
  payment_row public.billing_payments%rowtype;
  target_user_id uuid;
  target_email text;
  provider_subscription_key text;
  provider_payment_key text;
  normalized_subscription_status text;
  normalized_payment_status text;
  effective_amount integer;
  effective_currency text;
  effective_plan text;
  effective_period_start timestamptz;
  subscription_record_id uuid;
  had_approved_payment boolean := false;
  subscription_applied boolean := false;
  payment_applied boolean := false;
  payment_signal_current boolean := true;
  payment_already_approved boolean := false;
  keep_paid_access boolean := false;
  outcome text := 'RECONCILED';
begin
  if octet_length(coalesce(p_payload,'{}'::jsonb)::text)>262144 then
    raise exception 'PROVIDER_PAYLOAD_TOO_LARGE';
  end if;
  select e.* into event_row from public.billing_provider_events e
  where e.id=p_event_id for update;
  if not found then raise exception 'PROVIDER_EVENT_NOT_FOUND'; end if;
  if octet_length((coalesce(event_row.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb))::text)>262144 then
    raise exception 'PROVIDER_PAYLOAD_TOO_LARGE';
  end if;
  if event_row.processing_status='processed' then
    return query select false,'ALREADY_PROCESSED'::text,event_row.user_id;
    return;
  end if;
  if event_row.processing_status<>'processing' or event_row.lease_expires_at<=checked_at then
    raise exception 'PROVIDER_EVENT_LEASE_NOT_AVAILABLE';
  end if;

  provider_subscription_key := nullif(trim(coalesce(p_provider_subscription_id,'')),'');
  provider_payment_key := nullif(trim(coalesce(p_provider_payment_id,'')),'');
  if provider_subscription_key is not null then
    select s.* into subscription_row
    from public.billing_subscriptions s
    where s.provider='mercado_pago' and s.provider_subscription_id=provider_subscription_key;
  end if;

  if subscription_row.id is not null then
    target_user_id := subscription_row.user_id;
    if subscription_row.checkout_intent_id is not null then
      select i.* into intent_row from public.commercial_checkout_intents i
      where i.id=subscription_row.checkout_intent_id;
    end if;
  end if;

  if target_user_id is null and nullif(trim(coalesce(p_external_reference,'')),'') is not null then
    select i.* into intent_row
    from public.commercial_checkout_intents i
    where i.public_reference=p_external_reference or i.id::text=p_external_reference;
    if found then target_user_id := intent_row.user_id; end if;
  end if;

  if target_user_id is null and provider_subscription_key is not null then
    select i.* into intent_row
    from public.commercial_checkout_intents i
    where i.provider='mercado_pago' and i.provider_subscription_id=provider_subscription_key;
    if found then target_user_id := intent_row.user_id; end if;
  end if;

  if target_user_id is null then
    update public.billing_provider_events e set
      processing_status='ignored',result_code='UNMATCHED_REFERENCE',
      payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb),
      processed_at=checked_at,lease_expires_at=null,updated_at=checked_at
    where e.id=p_event_id;
    return query select false,'UNMATCHED_REFERENCE'::text,null::uuid;
    return;
  end if;

  -- Resolver primero la cuenta sin tomar locks de billing evita invertir el
  -- orden usado por checkout/admin. Desde aquí todas las mutaciones comerciales
  -- de este usuario quedan serializadas por la misma llave.
  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text,202609190001));
  if subscription_row.id is not null then
    select s.* into subscription_row from public.billing_subscriptions s
    where s.id=subscription_row.id for update;
    if subscription_row.user_id is distinct from target_user_id then
      raise exception 'BILLING_ACCOUNT_MISMATCH';
    end if;
  end if;
  if intent_row.id is not null then
    select i.* into intent_row from public.commercial_checkout_intents i
    where i.id=intent_row.id for update;
    if intent_row.user_id is distinct from target_user_id then
      raise exception 'BILLING_ACCOUNT_MISMATCH';
    end if;
  end if;

  select p.email into target_email from public.profiles p
  where p.user_id=target_user_id for update;
  effective_amount := coalesce(p_amount_minor,intent_row.amount_minor,subscription_row.amount_minor);
  effective_currency := upper(coalesce(p_currency,intent_row.currency,subscription_row.currency));
  effective_plan := coalesce(intent_row.plan_interval,subscription_row.plan_interval);

  if intent_row.provider_terminal_confirmed_at is not null then
    outcome := case
      when lower(coalesce(p_payment_status,'')) in ('approved','succeeded','paid')
        then 'CLOSED_CHECKOUT_PAYMENT_REVIEW'
      else 'CHECKOUT_TERMINALLY_CLOSED' end;
    update public.billing_provider_events e set
      processing_status='ignored',result_code=outcome,user_id=target_user_id,
      checkout_intent_id=intent_row.id,
      payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb),
      processed_at=checked_at,lease_expires_at=null,updated_at=checked_at
    where e.id=p_event_id;
    return query select false,outcome,target_user_id;
    return;
  end if;

  if effective_amount is null or effective_amount<=0
    or (lower(coalesce(p_payment_status,'')) in ('approved','succeeded','paid') and p_amount_minor is null)
    or (intent_row.id is not null and effective_amount<>intent_row.amount_minor)
    or (subscription_row.id is not null and p_amount_minor is not null
      and p_amount_minor<>subscription_row.amount_minor) then
    update public.billing_provider_events e set
      processing_status='ignored',result_code='AMOUNT_MISMATCH',user_id=target_user_id,
      checkout_intent_id=intent_row.id,
      payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb),
      processed_at=checked_at,lease_expires_at=null,updated_at=checked_at
    where e.id=p_event_id;
    return query select false,'AMOUNT_MISMATCH'::text,target_user_id;
    return;
  end if;
  if effective_currency is null or effective_currency !~ '^[A-Z]{3}$'
    or (lower(coalesce(p_payment_status,'')) in ('approved','succeeded','paid')
      and nullif(trim(coalesce(p_currency,'')),'') is null)
    or (intent_row.id is not null and effective_currency<>intent_row.currency)
    or (subscription_row.id is not null and p_currency is not null
      and effective_currency<>subscription_row.currency) then
    update public.billing_provider_events e set
      processing_status='ignored',result_code='CURRENCY_MISMATCH',user_id=target_user_id,
      checkout_intent_id=intent_row.id,
      payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb),
      processed_at=checked_at,lease_expires_at=null,updated_at=checked_at
    where e.id=p_event_id;
    return query select false,'CURRENCY_MISMATCH'::text,target_user_id;
    return;
  end if;
  if effective_plan is null or effective_plan not in ('monthly','annual') then
    update public.billing_provider_events e set
      processing_status='ignored',result_code='PLAN_NOT_RESOLVED',user_id=target_user_id,
      checkout_intent_id=intent_row.id,
      payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb),
      processed_at=checked_at,lease_expires_at=null,updated_at=checked_at
    where e.id=p_event_id;
    return query select false,'PLAN_NOT_RESOLVED'::text,target_user_id;
    return;
  end if;

  normalized_payment_status := case lower(coalesce(p_payment_status,''))
    when 'approved' then 'approved'
    when 'succeeded' then 'approved'
    when 'paid' then 'approved'
    when 'rejected' then 'failed'
    when 'failed' then 'failed'
    when 'refunded' then 'refunded'
    when 'cancelled' then 'cancelled'
    when 'canceled' then 'cancelled'
    else 'pending' end;

  effective_period_start := p_period_start;
  if normalized_payment_status='approved' then
    if provider_payment_key is null then
      update public.billing_provider_events e set
        processing_status='ignored',result_code='PAYMENT_ID_REQUIRED',user_id=target_user_id,
        checkout_intent_id=intent_row.id,
        payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb),
        processed_at=checked_at,lease_expires_at=null,updated_at=checked_at
      where e.id=p_event_id;
      return query select false,'PAYMENT_ID_REQUIRED'::text,target_user_id;
      return;
    end if;
    effective_period_start := coalesce(p_period_start,provider_time);
    if p_period_end is null or p_period_end<=effective_period_start then
      update public.billing_provider_events e set
        processing_status='ignored',result_code='MISSING_PAID_PERIOD',user_id=target_user_id,
        checkout_intent_id=intent_row.id,
        payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb),
        processed_at=checked_at,lease_expires_at=null,updated_at=checked_at
      where e.id=p_event_id;
      return query select false,'MISSING_PAID_PERIOD'::text,target_user_id;
      return;
    end if;
  end if;

  if provider_payment_key is not null then
    select bp.* into payment_row from public.billing_payments bp
    where bp.provider='mercado_pago' and bp.provider_payment_id=provider_payment_key
    for update;
    if payment_row.id is not null then
      payment_already_approved := payment_row.status='approved'
        and normalized_payment_status='approved';
      if payment_already_approved then
        payment_signal_current := false;
        outcome := 'DUPLICATE_PAYMENT_IGNORED';
      elsif provider_time<payment_row.provider_updated_at then
        payment_signal_current := false;
        outcome := 'STALE_PAYMENT_IGNORED';
      end if;
    end if;
  end if;

  select exists(
    select 1 from public.billing_payments bp
    where bp.user_id=target_user_id and bp.paid_at is not null
      and (provider_payment_key is null or bp.provider_payment_id<>provider_payment_key)
  ) into had_approved_payment;

  if provider_subscription_key is not null then
    normalized_subscription_status := case
      when lower(coalesce(p_subscription_status,'')) in ('cancelled','canceled')
        and coalesce(p_period_end,subscription_row.current_period_end)>checked_at
        then 'cancel_at_period_end'
      when lower(coalesce(p_subscription_status,'')) in ('cancelled','canceled','ended','terminated') then 'ended'
      when lower(coalesce(p_subscription_status,'')) in ('paused','past_due','overdue') then 'past_due'
      when normalized_payment_status='failed' and payment_signal_current then 'past_due'
      when normalized_payment_status='approved' and payment_signal_current then 'active'
      when subscription_row.status in ('active','cancel_at_period_end','past_due')
        then subscription_row.status
      else 'pending' end;

    if subscription_row.id is not null and provider_time<subscription_row.provider_updated_at then
      outcome := case
        when outcome='RECONCILED' then 'STALE_SUBSCRIPTION_IGNORED'
        else outcome end;
      subscription_record_id := subscription_row.id;
    else
      insert into public.billing_subscriptions(
        user_id,checkout_intent_id,provider,provider_subscription_id,plan_interval,status,
        amount_minor,currency,current_period_start,current_period_end,next_payment_at,
        cancel_at_period_end,provider_updated_at,cancelled_at,ended_at,created_at,updated_at
      ) values (
        target_user_id,intent_row.id,'mercado_pago',provider_subscription_key,
        effective_plan,normalized_subscription_status,effective_amount,effective_currency,
        coalesce(effective_period_start,subscription_row.current_period_start),
        coalesce(p_period_end,subscription_row.current_period_end),
        p_next_payment_at,
        normalized_subscription_status='cancel_at_period_end',provider_time,
        case when normalized_subscription_status in ('cancel_at_period_end','ended') then provider_time end,
        case when normalized_subscription_status='ended' then provider_time end,
        checked_at,checked_at
      ) on conflict(provider,provider_subscription_id) do update set
        checkout_intent_id=coalesce(public.billing_subscriptions.checkout_intent_id,excluded.checkout_intent_id),
        plan_interval=excluded.plan_interval,status=excluded.status,
        amount_minor=excluded.amount_minor,currency=excluded.currency,
        current_period_start=coalesce(excluded.current_period_start,public.billing_subscriptions.current_period_start),
        current_period_end=coalesce(excluded.current_period_end,public.billing_subscriptions.current_period_end),
        next_payment_at=coalesce(excluded.next_payment_at,public.billing_subscriptions.next_payment_at),
        cancel_at_period_end=excluded.cancel_at_period_end,
        provider_updated_at=excluded.provider_updated_at,
        cancelled_at=coalesce(excluded.cancelled_at,public.billing_subscriptions.cancelled_at),
        ended_at=coalesce(excluded.ended_at,public.billing_subscriptions.ended_at),
        updated_at=excluded.updated_at
      where excluded.provider_updated_at>=public.billing_subscriptions.provider_updated_at
      returning id into subscription_record_id;
      if subscription_record_id is null then
        select s.id into subscription_record_id from public.billing_subscriptions s
        where s.provider='mercado_pago' and s.provider_subscription_id=provider_subscription_key;
      end if;
      subscription_applied := subscription_record_id is not null;
    end if;
  end if;

  if provider_payment_key is not null and payment_signal_current then
    if payment_row.id is null or provider_time>=payment_row.provider_updated_at then
      insert into public.billing_payments(
        user_id,checkout_intent_id,subscription_id,provider,provider_payment_id,status,status_detail,
        amount_minor,currency,period_start,period_end,paid_at,provider_updated_at,created_at,updated_at
      ) values (
        target_user_id,intent_row.id,subscription_record_id,'mercado_pago',provider_payment_key,
        normalized_payment_status,left(p_status_detail,120),effective_amount,effective_currency,
        effective_period_start,p_period_end,
        case when normalized_payment_status='approved' then provider_time end,
        provider_time,checked_at,checked_at
      ) on conflict(provider,provider_payment_id) do update set
        subscription_id=coalesce(excluded.subscription_id,public.billing_payments.subscription_id),
        status=excluded.status,status_detail=excluded.status_detail,
        amount_minor=excluded.amount_minor,currency=excluded.currency,
        period_start=coalesce(excluded.period_start,public.billing_payments.period_start),
        period_end=coalesce(excluded.period_end,public.billing_payments.period_end),
        paid_at=coalesce(excluded.paid_at,public.billing_payments.paid_at),
        provider_updated_at=excluded.provider_updated_at,updated_at=excluded.updated_at
      where excluded.provider_updated_at>=public.billing_payments.provider_updated_at;
      payment_applied := true;
    end if;
  end if;

  if intent_row.id is not null and (subscription_applied or payment_applied) then
    update public.commercial_checkout_intents i set
      status=case
        when i.status='completed' then 'completed'
        when normalized_subscription_status='ended' then 'cancelled'
        when normalized_payment_status='approved' then 'completed'
        when normalized_payment_status='failed' then 'failed'
        when i.checkout_url is not null then 'ready'
        else 'provider_pending' end,
      provider_subscription_id=coalesce(provider_subscription_key,i.provider_subscription_id),
      provider_status=coalesce(p_subscription_status,p_payment_status,i.provider_status),
      provider_updated_at=greatest(coalesce(i.provider_updated_at,'epoch'::timestamptz),provider_time),
      claim_token=null,claim_expires_at=null,updated_at=checked_at
    where i.id=intent_row.id;
  end if;

  if subscription_record_id is not null then
    select s.* into subscription_row from public.billing_subscriptions s
    where s.id=subscription_record_id;
  end if;
  keep_paid_access := subscription_row.id is not null
    and subscription_row.status in ('active','cancel_at_period_end','past_due')
    and (subscription_row.current_period_end is null or subscription_row.current_period_end>checked_at)
    and exists(
      select 1 from public.billing_payments bp
      where bp.subscription_id=subscription_row.id and bp.paid_at is not null
    );

  if not public.has_paid_premium(target_user_id)
    and not exists(
      select 1 from public.billing_subscriptions current_subscription
      where current_subscription.user_id=target_user_id
        and current_subscription.status in ('pending','active','past_due','cancel_at_period_end')
    )
    and not exists(
      select 1 from public.commercial_trial_grants g
      where g.user_id=target_user_id
    ) then
    update public.commercial_trial_eligibility e set
      status='eligible',conflict_reason=null,revalidated_at=checked_at,updated_at=checked_at
    where e.user_id=target_user_id and e.status='conflict_paid_premium';
  end if;

  if subscription_row.status='cancel_at_period_end' and keep_paid_access then
    update public.profiles p set
      access_status='cancellation_scheduled',subscription_status='cancel_at_period_end',
      access_status_changed_at=checked_at,updated_at=checked_at
    where p.user_id=target_user_id and p.access_status<>'blocked';
  elsif subscription_row.status='ended' then
    update public.profiles p set
      access_status=case when exists(
        select 1 from public.commercial_trial_grants g
        where g.user_id=target_user_id and g.status='active' and g.trial_ends_at>checked_at
      ) then 'trial_active'
      when exists(
        select 1 from public.commercial_trial_eligibility e
        where e.user_id=target_user_id and e.status='eligible'
      ) then 'pending_activation'
      else 'subscription_ended' end,
      subscription_status='ended',access_status_changed_at=checked_at,updated_at=checked_at
    where p.user_id=target_user_id and p.access_status<>'blocked';
  elsif subscription_row.status='active' and keep_paid_access then
    update public.profiles p set
      access_status=case when effective_plan='annual' then 'paid_annual' else 'paid_monthly' end,
      subscription_status='active',access_status_changed_at=checked_at,updated_at=checked_at
    where p.user_id=target_user_id and p.access_status<>'blocked';
  elsif subscription_row.status='past_due'
    or (normalized_payment_status='failed' and payment_applied) then
    update public.profiles p set
      access_status=case
        when keep_paid_access then case when effective_plan='annual' then 'paid_annual' else 'paid_monthly' end
        when exists(
          select 1 from public.commercial_trial_grants g
          where g.user_id=target_user_id and g.status='active' and g.trial_ends_at>checked_at
        ) then 'trial_active'
        when exists(
          select 1 from public.commercial_trial_eligibility e
          where e.user_id=target_user_id and e.status='eligible'
        ) then 'pending_activation'
        else 'payment_failed' end,
      subscription_status='past_due',access_status_changed_at=checked_at,updated_at=checked_at
    where p.user_id=target_user_id and p.access_status<>'blocked';
  elsif normalized_payment_status='approved' and payment_applied then
    update public.profiles p set
      access_status=case when effective_plan='annual' then 'paid_annual' else 'paid_monthly' end,
      subscription_status='active',access_status_changed_at=checked_at,updated_at=checked_at
    where p.user_id=target_user_id and p.access_status<>'blocked';
  elsif (subscription_row.status='pending'
      or (normalized_payment_status='pending' and (subscription_applied or payment_applied)))
    and not exists(
      select 1 from public.commercial_trial_grants g
      where g.user_id=target_user_id and g.status='active' and g.trial_ends_at>checked_at
    ) then
    update public.profiles p set
      access_status='payment_pending',subscription_status='pending',
      access_status_changed_at=checked_at,updated_at=checked_at
    where p.user_id=target_user_id and p.access_status not in ('blocked','legacy_premium','active');
  end if;

  if target_email ~* '^[^@[:space:]]+@[^@[:space:]]+$' then
    if normalized_payment_status='approved' and payment_applied then
      update public.email_outbox e set
        status='superseded',next_attempt_at=null,last_error_code=null,
        claim_token=null,claim_expires_at=null,updated_at=checked_at
      where e.user_id=target_user_id and e.template_key='renewal_pending'
        and e.status in ('generated','queued','failed')
        and e.template_data->>'provider_payment_id'=provider_payment_key;
      insert into public.email_outbox(
        user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,status
      ) values (
        target_user_id,'user',target_email,
        case when had_approved_payment then 'subscription_renewed' else 'premium_welcome' end,
        case when had_approved_payment
          then 'subscription_renewed:'||provider_payment_key
          else 'premium_welcome:'||target_user_id::text end,
        jsonb_build_object(
          'plan_interval',effective_plan,'amount_minor',effective_amount,
          'currency',effective_currency,
          'period_start',coalesce(subscription_row.current_period_start,effective_period_start),
          'period_end',coalesce(subscription_row.current_period_end,p_period_end),
          'next_payment_at',coalesce(subscription_row.next_payment_at,p_next_payment_at),
          'renewal_reference_at',coalesce(
            subscription_row.next_payment_at,p_next_payment_at,
            subscription_row.current_period_end,p_period_end
          )
        ),'generated'
      ) on conflict(dedupe_key) do nothing;
    elsif normalized_payment_status='failed' and (payment_applied or subscription_applied) then
      insert into public.email_outbox(
        user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,status
      ) values (
        target_user_id,'user',target_email,'payment_failed',
        'payment_failed:'||coalesce(provider_payment_key,p_event_id::text),
        jsonb_build_object('plan_interval',effective_plan,'status_detail',left(p_status_detail,80)),'generated'
      ) on conflict(dedupe_key) do nothing;
    elsif normalized_payment_status='pending'
      and had_approved_payment
      and provider_payment_key is not null
      and (payment_applied or subscription_applied) then
      insert into public.email_outbox(
        user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,
        status,next_attempt_at
      ) values (
        target_user_id,'user',target_email,'renewal_pending',
        'renewal_pending:'||coalesce(provider_payment_key,p_event_id::text),
        jsonb_build_object(
          'plan_interval',effective_plan,
          'provider_payment_id',provider_payment_key,
          'next_review_at',checked_at+interval '15 minutes'
        ),'generated',checked_at+interval '15 minutes'
      ) on conflict(dedupe_key) do nothing;
    end if;
    if subscription_row.status in ('cancel_at_period_end','ended') then
      insert into public.email_outbox(
        user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,status
      ) values (
        target_user_id,'user',target_email,'subscription_cancelled',
        'subscription_cancelled:'||coalesce(provider_subscription_key,p_event_id::text),
        jsonb_build_object(
          'cancelled_at',coalesce(subscription_row.cancelled_at,provider_time),
          'access_until',coalesce(subscription_row.current_period_end,p_period_end)
        ),'generated'
      ) on conflict(dedupe_key) do nothing;
    end if;
  end if;

  update public.billing_provider_events e set
    processing_status='processed',result_code=outcome,user_id=target_user_id,
    checkout_intent_id=intent_row.id,
    payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb),
    processed_at=checked_at,lease_expires_at=null,updated_at=checked_at
  where e.id=p_event_id;
  return query select (subscription_applied or payment_applied),outcome,target_user_id;
end;
$$;
revoke all on function public.reconcile_billing_event(
  uuid,text,text,text,text,text,text,integer,text,timestamptz,timestamptz,timestamptz,timestamptz,jsonb
) from public,anon,authenticated;
grant execute on function public.reconcile_billing_event(
  uuid,text,text,text,text,text,text,integer,text,timestamptz,timestamptz,timestamptz,timestamptz,jsonb
) to service_role;

create or replace function public.claim_next_email(p_now timestamptz default now())
returns table(
  id uuid,
  user_id uuid,
  recipient_kind text,
  recipient_email text,
  template_key text,
  dedupe_key text,
  template_data jsonb,
  attempt_count integer,
  created_at timestamptz,
  claim_token uuid,
  claim_expires_at timestamptz
)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  candidate public.email_outbox%rowtype;
  issued_claim uuid := gen_random_uuid();
begin
  if p_now is null then raise exception 'INVALID_CLAIM_TIME'; end if;
  select e.* into candidate
  from public.email_outbox e
  where
    (e.status='generated' and (e.next_attempt_at is null or e.next_attempt_at<=p_now))
    or (e.status='failed' and e.next_attempt_at is not null and e.next_attempt_at<=p_now)
    or (e.status='queued' and e.claim_expires_at is not null and e.claim_expires_at<=p_now)
  order by coalesce(e.next_attempt_at,e.created_at),e.created_at
  for update skip locked
  limit 1;
  if not found then return; end if;

  update public.email_outbox e set
    status='queued',attempt_count=e.attempt_count+1,
    claim_token=issued_claim,claim_expires_at=p_now+interval '5 minutes',
    next_attempt_at=null,last_error_code=null,updated_at=p_now
  where e.id=candidate.id
  returning e.* into candidate;

  return query select
    candidate.id,candidate.user_id,candidate.recipient_kind,candidate.recipient_email,
    candidate.template_key,candidate.dedupe_key,candidate.template_data,
    candidate.attempt_count,candidate.created_at,candidate.claim_token,candidate.claim_expires_at;
end;
$$;
revoke all on function public.claim_next_email(timestamptz)
  from public,anon,authenticated;
grant execute on function public.claim_next_email(timestamptz) to service_role;

create or replace function public.revalidate_email_delivery(
  p_outbox_id uuid,
  p_claim_token uuid
)
returns boolean language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := statement_timestamp();
  outbox_row public.email_outbox%rowtype;
  payment_key text;
begin
  select e.* into outbox_row from public.email_outbox e
  where e.id=p_outbox_id and e.status='queued' and e.claim_token=p_claim_token
    and e.claim_expires_at>checked_at
  for update;
  if not found then return false; end if;

  if outbox_row.template_key='renewal_pending' then
    payment_key := nullif(trim(coalesce(outbox_row.template_data->>'provider_payment_id','')),'');
    if payment_key is null or exists(
      select 1 from public.billing_payments bp
      where bp.user_id=outbox_row.user_id
        and bp.provider='mercado_pago'
        and bp.provider_payment_id=payment_key
        and bp.status='approved'
        and bp.paid_at is not null
    ) then
      update public.email_outbox e set
        status='superseded',claim_token=null,claim_expires_at=null,
        next_attempt_at=null,last_error_code=null,updated_at=checked_at
      where e.id=outbox_row.id;
      return false;
    end if;
  end if;
  return true;
end;
$$;
revoke all on function public.revalidate_email_delivery(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.revalidate_email_delivery(uuid,uuid) to service_role;

create or replace function public.complete_email_delivery(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_status text,
  p_provider_message_id text,
  p_error_code text,
  p_next_retry_at timestamptz
)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := statement_timestamp();
  outbox_row public.email_outbox%rowtype;
begin
  if p_status is null or p_status not in ('accepted','delivered','failed') then
    raise exception 'INVALID_EMAIL_DELIVERY_STATUS';
  end if;
  select e.* into outbox_row from public.email_outbox e
  where e.id=p_outbox_id and e.claim_token=p_claim_token for update;
  if not found then raise exception 'EMAIL_CLAIM_NOT_AVAILABLE'; end if;
  if outbox_row.claim_expires_at<=checked_at then raise exception 'EMAIL_CLAIM_EXPIRED'; end if;

  if p_status in ('accepted','delivered') then
    if p_provider_message_id is null or length(p_provider_message_id) not between 1 and 200 then
      raise exception 'PROVIDER_MESSAGE_ID_REQUIRED';
    end if;
    update public.email_outbox e set
      status=p_status,provider_message_id=p_provider_message_id,
      accepted_at=coalesce(e.accepted_at,checked_at),
      delivered_at=case when p_status='delivered' then checked_at else e.delivered_at end,
      failed_at=null,last_error_code=null,next_attempt_at=null,
      claim_token=null,claim_expires_at=null,updated_at=checked_at
    where e.id=p_outbox_id;
  else
    if p_error_code is null or p_error_code !~ '^[A-Z0-9_]{1,80}$' then
      raise exception 'INVALID_EMAIL_ERROR_CODE';
    end if;
    if p_next_retry_at is not null and p_next_retry_at<=checked_at then
      raise exception 'INVALID_EMAIL_RETRY_TIME';
    end if;
    update public.email_outbox e set
      status='failed',provider_message_id=coalesce(p_provider_message_id,e.provider_message_id),
      failed_at=checked_at,last_error_code=p_error_code,
      next_attempt_at=case when e.attempt_count<8 then p_next_retry_at else null end,
      claim_token=null,claim_expires_at=null,updated_at=checked_at
    where e.id=p_outbox_id;
  end if;
end;
$$;
revoke all on function public.complete_email_delivery(uuid,uuid,text,text,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.complete_email_delivery(uuid,uuid,text,text,text,timestamptz)
  to service_role;

create or replace function public.run_commercial_maintenance(p_now timestamptz default now())
returns table(expired_trials integer,ended_subscriptions integer,queued_emails integer)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  grant_item record;
  subscription_item record;
  eligibility_item record;
  affected integer;
  trial_count integer := 0;
  subscription_count integer := 0;
  email_count integer := 0;
begin
  if p_now is null then raise exception 'INVALID_MAINTENANCE_TIME'; end if;

  for grant_item in
    update public.commercial_trial_grants g set status='expired',updated_at=p_now
    where g.status='active' and g.trial_ends_at<=p_now
    returning g.id,g.user_id,g.trial_ends_at
  loop
    trial_count := trial_count+1;
    update public.profiles p set
      access_status='trial_expired',access_status_changed_at=p_now,updated_at=p_now
    where p.user_id=grant_item.user_id and p.access_status='trial_active'
      and not exists(
        select 1 from public.billing_subscriptions s
        where s.user_id=p.user_id
          and s.status in ('active','cancel_at_period_end','past_due')
          and (s.current_period_end is null or s.current_period_end>p_now)
          and exists(
            select 1 from public.billing_payments bp
            where bp.subscription_id=s.id and bp.paid_at is not null
          )
      );
    insert into public.email_outbox(
      user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,status
    )
    select
      p.user_id,'user',p.email,'commercial_trial_ended',
      'commercial_trial_ended:'||grant_item.id::text,
      jsonb_build_object('trial_ended_at',grant_item.trial_ends_at),'generated'
    from public.profiles p
    where p.user_id=grant_item.user_id
      and p.email ~* '^[^@[:space:]]+@[^@[:space:]]+$'
      and p.access_status not in ('legacy_premium','active')
      and not exists(
        select 1 from public.billing_subscriptions s
        where s.user_id=p.user_id
          and s.status in ('active','cancel_at_period_end','past_due')
          and (s.current_period_end is null or s.current_period_end>p_now)
          and exists(
            select 1 from public.billing_payments bp
            where bp.subscription_id=s.id and bp.paid_at is not null
          )
      )
    on conflict(dedupe_key) do nothing;
    get diagnostics affected=row_count;
    email_count := email_count+affected;
  end loop;

  for subscription_item in
    update public.billing_subscriptions s set
      status='ended',cancel_at_period_end=false,ended_at=coalesce(s.ended_at,p_now),updated_at=p_now
    where s.status='cancel_at_period_end' and s.current_period_end is not null
      and s.current_period_end<=p_now
    returning s.id,s.user_id,s.provider_subscription_id,s.current_period_end
  loop
    subscription_count := subscription_count+1;
    update public.profiles p set
      access_status=case when exists(
        select 1 from public.commercial_trial_grants g
        where g.user_id=p.user_id and g.status='active' and g.trial_ends_at>p_now
      ) then 'trial_active' else 'subscription_ended' end,
      subscription_status='ended',access_status_changed_at=p_now,updated_at=p_now
    where p.user_id=subscription_item.user_id and p.access_status<>'blocked';
    insert into public.email_outbox(
      user_id,recipient_kind,recipient_email,template_key,dedupe_key,template_data,status
    )
    select
      p.user_id,'user',p.email,'subscription_cancelled',
      'subscription_cancelled:'||subscription_item.provider_subscription_id,
      jsonb_build_object(
        'cancelled_at',p_now,
        'access_until',subscription_item.current_period_end
      ),'generated'
    from public.profiles p
    where p.user_id=subscription_item.user_id and p.email ~* '^[^@[:space:]]+@[^@[:space:]]+$'
    on conflict(dedupe_key) do nothing;
    get diagnostics affected=row_count;
    email_count := email_count+affected;
  end loop;

  -- El conflicto no consume el beneficio: cuando ya no existe acceso Paid
  -- vigente, la evidencia vuelve a estar disponible para activación. Bloquear
  -- el perfil comparte la fila de serialización usada por las otras mutaciones.
  for eligibility_item in
    select e.user_id,e.campaign_key
    from public.commercial_trial_eligibility e
    where e.status='conflict_paid_premium'
      and not exists(
        select 1 from public.commercial_trial_grants g
        where g.user_id=e.user_id and g.campaign_key=e.campaign_key
      )
  loop
    perform 1 from public.profiles p
    where p.user_id=eligibility_item.user_id for update;
    update public.commercial_trial_eligibility e set
      status='eligible',conflict_reason=null,revalidated_at=p_now,updated_at=p_now
    where e.user_id=eligibility_item.user_id
      and e.campaign_key=eligibility_item.campaign_key
      and e.status='conflict_paid_premium'
      and not exists(
        select 1 from public.billing_subscriptions s
        where s.user_id=e.user_id
          and s.status in ('pending','active','cancel_at_period_end','past_due')
      )
      and not exists(
        select 1 from public.profiles legacy
        where legacy.user_id=e.user_id and legacy.role<>'superadmin'
          and legacy.access_status in ('legacy_premium','active')
      );
    if found then
      update public.profiles p set
        access_status='pending_activation',subscription_status=case
          when p.subscription_status in ('cancelled','ended') then p.subscription_status
          else 'none' end,
        access_status_changed_at=p_now,updated_at=p_now
      where p.user_id=eligibility_item.user_id
        and p.access_status not in ('blocked','trial_active','trial','legacy_premium','active');
    end if;
  end loop;

  update public.commercial_checkout_intents i set
    status='expired',claim_token=null,claim_expires_at=null,updated_at=p_now
  where i.status in ('created','provider_pending') and i.expires_at<=p_now
    and i.provider_subscription_id is null and i.checkout_url is null;

  return query select trial_count,subscription_count,email_count;
end;
$$;
revoke all on function public.run_commercial_maintenance(timestamptz)
  from public,anon,authenticated;
grant execute on function public.run_commercial_maintenance(timestamptz) to service_role;

commit;
