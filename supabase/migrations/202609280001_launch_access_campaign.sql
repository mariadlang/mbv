-- My Best Version: campaña aislada de invitación al lanzamiento.
-- Forward-only y fail-closed: crea el contrato de registro/confirmación, pero
-- deja la campaña en draft y no asigna ni activa beneficios.

begin;

create extension if not exists pgcrypto;

create table public.launch_access_campaigns (
  campaign_key text primary key check (campaign_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  state text not null default 'draft' check (state in ('draft','collecting','closed')),
  registration_enabled boolean not null default false,
  newsletter_registration_enabled boolean not null default false,
  email_delivery_enabled boolean not null default false,
  total_slots integer not null default 20 check (total_slots between 1 and 1000),
  accepted_requests integer not null default 0 check (accepted_requests >= 0),
  trial_days integer not null default 30 check (trial_days between 1 and 365),
  confirmation_ttl_minutes integer not null default 1440 check (confirmation_ttl_minutes between 15 and 10080),
  email_requests_per_hour integer not null default 3 check (email_requests_per_hour between 1 and 20),
  client_requests_per_hour integer not null default 10 check (client_requests_per_hour between 1 and 500),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (accepted_requests <= total_slots),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

insert into public.launch_access_campaigns(
  campaign_key,state,registration_enabled,newsletter_registration_enabled,
  email_delivery_enabled,total_slots,trial_days
) values ('launch-20-v1','draft',false,false,false,20,30)
on conflict(campaign_key) do nothing;

create table public.launch_access_registrations (
  id uuid primary key default gen_random_uuid(),
  campaign_key text not null references public.launch_access_campaigns(campaign_key),
  email_normalized text not null check (
    length(email_normalized) between 3 and 254
    and email_normalized = lower(trim(email_normalized))
    and email_normalized ~* '^[^@[:space:]]+@[^@[:space:]]+$'
  ),
  registration_type text not null check (registration_type in ('waitlist','newsletter_only')),
  newsletter_preference boolean not null default false,
  newsletter_consent_at timestamptz,
  waitlist_requested_at timestamptz,
  newsletter_subscribed_at timestamptz,
  origin text not null check (origin in ('landing_launch')),
  status text not null default 'received' check (status in (
    'received','subscribed','pending_confirmation','email_confirmed','closed'
  )),
  token_hash bytea,
  token_version integer check (token_version is null or token_version > 0),
  token_expires_at timestamptz,
  requested_at timestamptz not null default now(),
  last_confirmation_requested_at timestamptz,
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  last_confirmation_outbox_id uuid references public.email_outbox(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_key,email_normalized),
  check (registration_type<>'waitlist' or waitlist_requested_at is not null),
  check (registration_type<>'newsletter_only' or waitlist_requested_at is null),
  check (registration_type<>'newsletter_only' or newsletter_preference),
  check (
    (newsletter_preference and newsletter_consent_at is not null and newsletter_subscribed_at is not null)
    or (not newsletter_preference and newsletter_consent_at is null and newsletter_subscribed_at is null)
  ),
  check (confirmed_at is null or confirmation_sent_at is not null),
  check (token_expires_at is null or token_expires_at > requested_at),
  check (
    registration_type<>'newsletter_only'
    or (status='subscribed' and token_hash is null and token_version is null and token_expires_at is null)
  )
);

create table public.launch_access_rate_limits (
  campaign_key text not null references public.launch_access_campaigns(campaign_key) on delete cascade,
  scope_kind text not null check (scope_kind in ('email','client')),
  scope_fingerprint text not null check (scope_fingerprint ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key(campaign_key,scope_kind,scope_fingerprint)
);

create index launch_access_registrations_status_idx
  on public.launch_access_registrations(campaign_key,status,requested_at);

alter table public.launch_access_campaigns enable row level security;
alter table public.launch_access_registrations enable row level security;
alter table public.launch_access_rate_limits enable row level security;

revoke all on table public.launch_access_campaigns,
  public.launch_access_registrations,
  public.launch_access_rate_limits from public,anon,authenticated,service_role;
-- El backend sólo necesita leer el estado público de campaña de forma directa.
-- Registros, límites y grants quedan accesibles únicamente mediante las RPC
-- security-definer específicas; en particular, service_role no puede insertar
-- ni activar grants por una consulta directa mientras el rollout está apagado.
grant select on table public.launch_access_campaigns to service_role;

-- El outbox existente conserva todas sus variantes y añade únicamente la
-- confirmación de esta campaña. No se almacenan tokens bearer en template_data.
alter table public.email_outbox
  drop constraint if exists email_outbox_template_key_check;
alter table public.email_outbox
  add constraint email_outbox_template_key_check check (template_key in (
    'commercial_eligibility_admin','commercial_trial_activated','commercial_trial_ended',
    'premium_welcome','subscription_renewed','renewal_payment_requested','renewal_pending',
    'payment_failed','subscription_cancelled','launch_confirmation'
  ));

create or replace function public.request_launch_access(
  p_campaign_key text,
  p_email text,
  p_email_fingerprint text,
  p_client_fingerprint text,
  p_request_type text,
  p_newsletter_opt_in boolean,
  p_origin text,
  p_now timestamptz default now()
)
returns table(
  outcome text,
  registration_id uuid,
  outbox_id uuid,
  recipient_email text,
  token_nonce text,
  token_version integer,
  confirmation_expires_at timestamptz
)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := p_now;
  normalized_email text := lower(trim(coalesce(p_email,'')));
  campaign_row public.launch_access_campaigns%rowtype;
  registration_row public.launch_access_registrations%rowtype;
  email_attempts integer;
  client_attempts integer;
begin
  if checked_at is null then raise exception 'INVALID_LAUNCH_REQUEST_TIME'; end if;
  if p_campaign_key is null or p_campaign_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$' then
    raise exception 'INVALID_LAUNCH_CAMPAIGN';
  end if;
  if length(normalized_email) not between 3 and 254
    or normalized_email !~* '^[^@[:space:]]+@[^@[:space:]]+$' then
    raise exception 'INVALID_LAUNCH_EMAIL';
  end if;
  if p_email_fingerprint is null
    or p_email_fingerprint !~ '^[a-f0-9]{64}$'
    or p_client_fingerprint is null
    or p_client_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_LAUNCH_FINGERPRINT';
  end if;
  if p_request_type is null
    or p_request_type not in ('waitlist','newsletter_only')
    or p_origin is null
    or p_origin<>'landing_launch' then
    raise exception 'INVALID_LAUNCH_REQUEST';
  end if;
  if p_newsletter_opt_in is null
    or (p_request_type='newsletter_only' and not p_newsletter_opt_in) then
    raise exception 'NEWSLETTER_CONSENT_REQUIRED';
  end if;

  select c.* into campaign_row
  from public.launch_access_campaigns c
  where c.campaign_key=p_campaign_key
  for update;

  if not found
    or campaign_row.state='draft'
    or (campaign_row.starts_at is not null and checked_at<campaign_row.starts_at)
    or (campaign_row.ends_at is not null and checked_at>=campaign_row.ends_at) then
    return query select 'campaign_unavailable'::text,null::uuid,null::uuid,
      null::text,null::text,null::integer,null::timestamptz;
    return;
  end if;
  if p_request_type='waitlist' then
    if campaign_row.state='closed'
      or campaign_row.accepted_requests>=campaign_row.total_slots then
      return query select case
          when campaign_row.newsletter_registration_enabled then 'campaign_closed'::text
          else 'campaign_unavailable'::text
        end,null::uuid,null::uuid,
        null::text,null::text,null::integer,null::timestamptz;
      return;
    end if;
    if campaign_row.state<>'collecting' or not campaign_row.registration_enabled then
      return query select 'campaign_unavailable'::text,null::uuid,null::uuid,
        null::text,null::text,null::integer,null::timestamptz;
      return;
    end if;
  elsif not campaign_row.newsletter_registration_enabled then
    return query select 'campaign_unavailable'::text,null::uuid,null::uuid,
      null::text,null::text,null::integer,null::timestamptz;
    return;
  end if;

  insert into public.launch_access_rate_limits(
    campaign_key,scope_kind,scope_fingerprint,window_started_at,request_count,updated_at
  ) values (p_campaign_key,'email',p_email_fingerprint,checked_at,1,checked_at)
  on conflict(campaign_key,scope_kind,scope_fingerprint) do update set
    window_started_at=case
      when public.launch_access_rate_limits.window_started_at<=checked_at-interval '1 hour'
        then checked_at else public.launch_access_rate_limits.window_started_at end,
    request_count=case
      when public.launch_access_rate_limits.window_started_at<=checked_at-interval '1 hour'
        then 1 else public.launch_access_rate_limits.request_count+1 end,
    updated_at=checked_at
  returning request_count into email_attempts;

  insert into public.launch_access_rate_limits(
    campaign_key,scope_kind,scope_fingerprint,window_started_at,request_count,updated_at
  ) values (p_campaign_key,'client',p_client_fingerprint,checked_at,1,checked_at)
  on conflict(campaign_key,scope_kind,scope_fingerprint) do update set
    window_started_at=case
      when public.launch_access_rate_limits.window_started_at<=checked_at-interval '1 hour'
        then checked_at else public.launch_access_rate_limits.window_started_at end,
    request_count=case
      when public.launch_access_rate_limits.window_started_at<=checked_at-interval '1 hour'
        then 1 else public.launch_access_rate_limits.request_count+1 end,
    updated_at=checked_at
  returning request_count into client_attempts;

  if email_attempts>campaign_row.email_requests_per_hour
    or client_attempts>campaign_row.client_requests_per_hour then
    return query select 'rate_limited'::text,null::uuid,null::uuid,
      null::text,null::text,null::integer,null::timestamptz;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_campaign_key||':'||encode(digest(convert_to(normalized_email,'UTF8'),'sha256'),'hex'),
    202609280001
  ));

  select r.* into registration_row
  from public.launch_access_registrations r
  where r.campaign_key=p_campaign_key and r.email_normalized=normalized_email
  for update;

  if found then
    if p_request_type='waitlist' and registration_row.registration_type='newsletter_only' then
      update public.launch_access_registrations r set
        registration_type='waitlist',
        status='received',
        waitlist_requested_at=coalesce(r.waitlist_requested_at,checked_at),
        newsletter_preference=r.newsletter_preference or p_newsletter_opt_in,
        newsletter_consent_at=case
          when r.newsletter_preference then r.newsletter_consent_at
          when p_newsletter_opt_in then checked_at
          else null
        end,
        newsletter_subscribed_at=case
          when r.newsletter_preference then r.newsletter_subscribed_at
          when p_newsletter_opt_in then checked_at
          else null
        end,
        updated_at=checked_at
      where r.id=registration_row.id;
      update public.launch_access_campaigns c set
        accepted_requests=c.accepted_requests+1,
        updated_at=checked_at
      where c.campaign_key=p_campaign_key;
      return query select 'request_received'::text,null::uuid,null::uuid,
        null::text,null::text,null::integer,null::timestamptz;
      return;
    elsif p_newsletter_opt_in and not registration_row.newsletter_preference then
      update public.launch_access_registrations r set
        newsletter_preference=true,
        newsletter_consent_at=checked_at,
        newsletter_subscribed_at=checked_at,
        updated_at=checked_at
      where r.id=registration_row.id;
    end if;

    -- Respuesta idéntica para correos ya registrados, sin crear otra fila,
    -- consumir capacidad ni revelar el estado previo de la dirección.
    return query select case when p_request_type='newsletter_only'
      then 'newsletter_subscribed' else 'already_requested' end::text,null::uuid,null::uuid,
      null::text,null::text,null::integer,null::timestamptz;
    return;
  end if;

  insert into public.launch_access_registrations(
    campaign_key,email_normalized,registration_type,newsletter_preference,
    newsletter_consent_at,waitlist_requested_at,newsletter_subscribed_at,
    origin,status,requested_at,created_at,updated_at
  ) values (
    p_campaign_key,normalized_email,
    case when p_request_type='newsletter_only' then 'newsletter_only' else 'waitlist' end,
    p_newsletter_opt_in,
    case when p_newsletter_opt_in then checked_at else null end,
    case when p_request_type='waitlist' then checked_at else null end,
    case when p_newsletter_opt_in then checked_at else null end,
    p_origin,case when p_request_type='newsletter_only' then 'subscribed' else 'received' end,
    checked_at,checked_at,checked_at
  ) returning * into registration_row;

  if p_request_type='waitlist' then
    update public.launch_access_campaigns c set
      accepted_requests=c.accepted_requests+1,
      updated_at=checked_at
    where c.campaign_key=p_campaign_key;
  end if;

  -- El formulario sólo confirma después del commit. No genera token, outbox ni
  -- correo inmediato; los avisos futuros operan como un proceso separado.
  return query select case when p_request_type='newsletter_only'
    then 'newsletter_subscribed' else 'request_received' end::text,
    null::uuid,null::uuid,null::text,null::text,null::integer,null::timestamptz;
end;
$$;
revoke all on function public.request_launch_access(text,text,text,text,text,boolean,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.request_launch_access(text,text,text,text,text,boolean,text,timestamptz)
  to service_role;

-- Reclama exactamente el mensaje generado por la solicitud actual. Esto evita
-- que el endpoint público drene correos de facturación o de otras personas.
create or replace function public.claim_launch_confirmation_email(
  p_outbox_id uuid,
  p_now timestamptz default now()
)
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
  if p_outbox_id is null or p_now is null then return; end if;
  select e.* into candidate
  from public.email_outbox e
  where e.id=p_outbox_id and e.template_key='launch_confirmation' and (
    (e.status='generated' and (e.next_attempt_at is null or e.next_attempt_at<=p_now))
    or (e.status='failed' and e.next_attempt_at is not null and e.next_attempt_at<=p_now)
    or (e.status='queued' and e.claim_expires_at is not null and e.claim_expires_at<=p_now)
  )
  for update skip locked;
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
revoke all on function public.claim_launch_confirmation_email(uuid,timestamptz)
  from public,anon,authenticated;
grant execute on function public.claim_launch_confirmation_email(uuid,timestamptz)
  to service_role;

create or replace function public.revalidate_launch_confirmation_email(
  p_outbox_id uuid,
  p_claim_token uuid
)
returns boolean language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := statement_timestamp();
  outbox_row public.email_outbox%rowtype;
begin
  select e.* into outbox_row
  from public.email_outbox e
  where e.id=p_outbox_id and e.template_key='launch_confirmation'
    and e.status='queued' and e.claim_token=p_claim_token
    and e.claim_expires_at>checked_at
  for update;
  if not found then return false; end if;

  if not exists(
    select 1
    from public.launch_access_registrations r
    join public.launch_access_campaigns c on c.campaign_key=r.campaign_key
    where r.last_confirmation_outbox_id=outbox_row.id
      and r.token_version=(outbox_row.template_data->>'token_version')::integer
      and r.token_expires_at>checked_at
      and r.status in ('pending_confirmation','email_confirmed')
      and c.email_delivery_enabled
      and (
        ((outbox_row.template_data->>'request_type')='waitlist'
          and r.registration_type='waitlist'
          and c.state in ('collecting','closed'))
        or ((outbox_row.template_data->>'request_type')='newsletter_only'
          and r.newsletter_preference
          and c.newsletter_registration_enabled)
      )
  ) then
    update public.email_outbox e set
      status='superseded',claim_token=null,claim_expires_at=null,
      next_attempt_at=null,last_error_code=null,updated_at=checked_at
    where e.id=outbox_row.id;
    return false;
  end if;
  return true;
end;
$$;
revoke all on function public.revalidate_launch_confirmation_email(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.revalidate_launch_confirmation_email(uuid,uuid)
  to service_role;

create or replace function public.complete_launch_confirmation_delivery(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_status text,
  p_provider_message_id text,
  p_error_code text,
  p_next_retry_at timestamptz
)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare checked_at timestamptz := statement_timestamp();
begin
  perform public.complete_email_delivery(
    p_outbox_id,p_claim_token,p_status,p_provider_message_id,p_error_code,p_next_retry_at
  );
  if p_status in ('accepted','delivered') then
    update public.launch_access_registrations r set
      confirmation_sent_at=coalesce(r.confirmation_sent_at,checked_at),
      updated_at=checked_at
    where r.last_confirmation_outbox_id=p_outbox_id;
  end if;
end;
$$;
revoke all on function public.complete_launch_confirmation_delivery(uuid,uuid,text,text,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.complete_launch_confirmation_delivery(uuid,uuid,text,text,text,timestamptz)
  to service_role;

create or replace function public.confirm_launch_access_email(
  p_campaign_key text,
  p_registration_id uuid,
  p_token_version integer,
  p_token_nonce text,
  p_now timestamptz default now()
)
returns table(outcome text)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare registration_row public.launch_access_registrations%rowtype;
begin
  if p_now is null or p_registration_id is null or p_token_version is null
    or p_token_nonce is null or p_token_nonce !~ '^[A-Za-z0-9_-]{43}$' then
    return query select 'invalid'::text;
    return;
  end if;
  select r.* into registration_row
  from public.launch_access_registrations r
  where r.id=p_registration_id and r.campaign_key=p_campaign_key
  for update;
  if not found
    or registration_row.token_version<>p_token_version
    or registration_row.token_hash<>digest(convert_to(p_token_nonce,'UTF8'),'sha256') then
    return query select 'invalid'::text;
    return;
  end if;
  if registration_row.token_expires_at<=p_now then
    return query select 'expired'::text;
    return;
  end if;
  if registration_row.status not in ('pending_confirmation','email_confirmed') then
    return query select 'invalid'::text;
    return;
  end if;

  update public.launch_access_registrations r set
    status='email_confirmed',
    confirmed_at=coalesce(r.confirmed_at,p_now),
    updated_at=p_now
  where r.id=registration_row.id;

  -- No reserva cupo, no crea grant y no modifica profiles/access_status.
  return query select 'email_confirmed'::text;
end;
$$;
revoke all on function public.confirm_launch_access_email(text,uuid,integer,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.confirm_launch_access_email(text,uuid,integer,text,timestamptz)
  to service_role;

-- El cron comercial existente nunca debe reclamar el nuevo tipo. La entrega de
-- lanzamiento usa exclusivamente claim_launch_confirmation_email(outbox_id).
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
  where e.template_key<>'launch_confirmation' and (
    (e.status='generated' and (e.next_attempt_at is null or e.next_attempt_at<=p_now))
    or (e.status='failed' and e.next_attempt_at is not null and e.next_attempt_at<=p_now)
    or (e.status='queued' and e.claim_expires_at is not null and e.claim_expires_at<=p_now)
  )
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

commit;
