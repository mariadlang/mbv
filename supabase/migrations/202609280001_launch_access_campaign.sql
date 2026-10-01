-- My Best Version: captura aislada de la waitlist de lanzamiento.
-- Forward-only y fail-closed: no toca cuentas, Premium, trials ni el outbox
-- comercial existente. La campaña nace en draft y no acepta registros.

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
  newsletter_consent_version text,
  newsletter_unsubscribed_at timestamptz,
  waitlist_requested_at timestamptz,
  newsletter_subscribed_at timestamptz,
  origin text not null check (origin in ('landing_launch')),
  status text not null default 'received' check (status in ('received','subscribed','closed')),
  requested_at timestamptz not null default now(),
  retention_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_key,email_normalized),
  check (registration_type<>'waitlist' or waitlist_requested_at is not null),
  check (registration_type<>'newsletter_only' or waitlist_requested_at is null),
  check (
    (newsletter_preference and newsletter_consent_at is not null
      and newsletter_consent_version is not null and newsletter_subscribed_at is not null
      and newsletter_unsubscribed_at is null)
    or (not newsletter_preference and (
      (newsletter_consent_at is null and newsletter_consent_version is null
        and newsletter_subscribed_at is null and newsletter_unsubscribed_at is null)
      or (newsletter_consent_at is not null and newsletter_consent_version is not null
        and newsletter_subscribed_at is not null and newsletter_unsubscribed_at is not null)
    ))
  ),
  check (
    newsletter_unsubscribed_at is null
    or newsletter_unsubscribed_at>=newsletter_subscribed_at
  )
);

create or replace function public.mark_launch_access_retention()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if new.state='closed' and old.state is distinct from 'closed' then
    update public.launch_access_registrations
    set retention_expires_at=least(
          coalesce(retention_expires_at,new.updated_at+interval '12 months'),
          new.updated_at+interval '12 months'
        ),
        updated_at=new.updated_at
    where campaign_key=new.campaign_key;
  end if;
  return new;
end;
$$;
revoke all on function public.mark_launch_access_retention() from public,anon,authenticated,service_role;

create trigger launch_access_campaign_retention
after update of state on public.launch_access_campaigns
for each row execute function public.mark_launch_access_retention();

-- Un recibo opaco permite repetir exactamente una solicitud cuya respuesta se
-- perdió, incluido el cupo 20, sin consultar ni revelar si un correo existe.
create table public.launch_access_request_receipts (
  campaign_key text not null references public.launch_access_campaigns(campaign_key) on delete cascade,
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  payload_fingerprint text not null check (payload_fingerprint ~ '^[a-f0-9]{64}$'),
  outcome text not null check (outcome in ('request_received','newsletter_subscribed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key(campaign_key,request_fingerprint),
  check (expires_at > created_at)
);

create table public.launch_access_rate_limits (
  campaign_key text not null references public.launch_access_campaigns(campaign_key) on delete cascade,
  client_fingerprint text not null check (client_fingerprint ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key(campaign_key,client_fingerprint)
);

create index launch_access_registrations_status_idx
  on public.launch_access_registrations(campaign_key,status,requested_at);
create index launch_access_request_receipts_expiry_idx
  on public.launch_access_request_receipts(expires_at);
create index launch_access_rate_limits_updated_idx
  on public.launch_access_rate_limits(updated_at);

alter table public.launch_access_campaigns enable row level security;
alter table public.launch_access_registrations enable row level security;
alter table public.launch_access_request_receipts enable row level security;
alter table public.launch_access_rate_limits enable row level security;

revoke all on table public.launch_access_campaigns,
  public.launch_access_registrations,
  public.launch_access_request_receipts,
  public.launch_access_rate_limits from public,anon,authenticated,service_role;
-- El backend sólo lee el estado agregado. Toda escritura ocurre mediante la
-- RPC security-definer y ninguna fila personal queda expuesta al navegador.
grant select on table public.launch_access_campaigns to service_role;

create or replace function public.request_launch_access(
  p_campaign_key text,
  p_email text,
  p_client_fingerprint text,
  p_request_fingerprint text,
  p_payload_fingerprint text,
  p_request_type text,
  p_newsletter_opt_in boolean,
  p_origin text,
  p_now timestamptz default now()
)
returns table(outcome text)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  checked_at timestamptz := p_now;
  normalized_email text := lower(trim(coalesce(p_email,'')));
  campaign_row public.launch_access_campaigns%rowtype;
  registration_row public.launch_access_registrations%rowtype;
  receipt_row public.launch_access_request_receipts%rowtype;
  client_attempts integer;
  client_limit integer;
  final_outcome text;
begin
  if checked_at is null then raise exception 'INVALID_LAUNCH_REQUEST_TIME'; end if;
  if p_campaign_key is null or p_campaign_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$' then
    raise exception 'INVALID_LAUNCH_CAMPAIGN';
  end if;
  if length(normalized_email) not between 3 and 254
    or normalized_email !~* '^[^@[:space:]]+@[^@[:space:]]+$' then
    raise exception 'INVALID_LAUNCH_EMAIL';
  end if;
  if p_client_fingerprint is null or p_client_fingerprint !~ '^[a-f0-9]{64}$'
    or p_request_fingerprint is null or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_payload_fingerprint is null or p_payload_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_LAUNCH_FINGERPRINT';
  end if;
  if p_request_type is null or p_request_type not in ('waitlist','newsletter_only')
    or p_origin is null or p_origin<>'landing_launch' then
    raise exception 'INVALID_LAUNCH_REQUEST';
  end if;
  if p_newsletter_opt_in is null
    or (p_request_type='newsletter_only' and not p_newsletter_opt_in) then
    raise exception 'NEWSLETTER_CONSENT_REQUIRED';
  end if;

  -- Serializa el mismo requestId antes de cualquier comprobación mutable.
  perform pg_advisory_xact_lock(hashtextextended(
    p_campaign_key||':'||p_request_fingerprint,202609300001
  ));
  -- Un recibo vencido deja de ser idempotente. Se elimina bajo el mismo lock
  -- para que su PK no convierta el reintento posterior en un error 500.
  delete from public.launch_access_request_receipts r
  where r.campaign_key=p_campaign_key
    and r.request_fingerprint=p_request_fingerprint
    and r.expires_at<=checked_at;
  select r.* into receipt_row
  from public.launch_access_request_receipts r
  where r.campaign_key=p_campaign_key
    and r.request_fingerprint=p_request_fingerprint
    and r.expires_at>checked_at;
  if found then
    if receipt_row.payload_fingerprint<>p_payload_fingerprint then
      return query select 'request_mismatch'::text;
    else
      return query select receipt_row.outcome;
    end if;
    return;
  end if;

  -- La cuota por cliente se evalúa antes del lock global de capacidad. Así el
  -- tráfico repetido de una misma fuente no serializa todas las altas.
  select c.client_requests_per_hour into client_limit
  from public.launch_access_campaigns c
  where c.campaign_key=p_campaign_key;
  if not found then
    return query select 'campaign_unavailable'::text;
    return;
  end if;

  insert into public.launch_access_rate_limits(
    campaign_key,client_fingerprint,window_started_at,request_count,updated_at
  ) values (p_campaign_key,p_client_fingerprint,checked_at,1,checked_at)
  on conflict(campaign_key,client_fingerprint) do update set
    window_started_at=case
      when public.launch_access_rate_limits.window_started_at<=checked_at-interval '1 hour'
        then checked_at else public.launch_access_rate_limits.window_started_at end,
    request_count=case
      when public.launch_access_rate_limits.window_started_at<=checked_at-interval '1 hour'
        then 1 else public.launch_access_rate_limits.request_count+1 end,
    updated_at=checked_at
  returning request_count into client_attempts;

  if client_attempts>client_limit then
    return query select 'rate_limited'::text;
    return;
  end if;

  select c.* into campaign_row
  from public.launch_access_campaigns c
  where c.campaign_key=p_campaign_key
  for update;

  if not found or campaign_row.state='draft'
    or (campaign_row.starts_at is not null and checked_at<campaign_row.starts_at) then
    return query select 'campaign_unavailable'::text;
    return;
  end if;

  if campaign_row.ends_at is not null and checked_at>=campaign_row.ends_at then
    if campaign_row.state<>'closed' then
      update public.launch_access_campaigns c set
        state='closed',registration_enabled=false,updated_at=campaign_row.ends_at
      where c.campaign_key=p_campaign_key;
    end if;
    return query select 'campaign_unavailable'::text;
    return;
  end if;

  if p_newsletter_opt_in and not campaign_row.newsletter_registration_enabled then
    return query select 'campaign_unavailable'::text;
    return;
  end if;
  if p_request_type='newsletter_only' then
    if not campaign_row.newsletter_registration_enabled then
      return query select 'campaign_unavailable'::text;
      return;
    end if;
    if campaign_row.state='closed'
      and campaign_row.updated_at+interval '12 months'<=checked_at then
      return query select 'campaign_unavailable'::text;
      return;
    end if;
  else
    -- Sólo un replay con su recibo opaco puede recuperar el último éxito. Una
    -- clave nueva recibe la misma respuesta cerrada para correos conocidos o no.
    if campaign_row.state='closed'
      or campaign_row.accepted_requests>=campaign_row.total_slots then
      return query select case
        when campaign_row.newsletter_registration_enabled then 'campaign_closed'::text
        else 'campaign_unavailable'::text
      end;
      return;
    end if;
    if campaign_row.state<>'collecting' or not campaign_row.registration_enabled then
      return query select 'campaign_unavailable'::text;
      return;
    end if;
  end if;

  select r.* into registration_row
  from public.launch_access_registrations r
  where r.campaign_key=p_campaign_key and r.email_normalized=normalized_email
  for update;

  if found then
    if p_request_type='waitlist' and registration_row.registration_type='newsletter_only' then
      update public.launch_access_registrations r set
        registration_type='waitlist',status='received',
        waitlist_requested_at=coalesce(r.waitlist_requested_at,checked_at),
        updated_at=checked_at
      where r.id=registration_row.id;
      update public.launch_access_campaigns c set
        accepted_requests=c.accepted_requests+1,updated_at=checked_at
      where c.campaign_key=p_campaign_key;
      final_outcome := 'request_received';
    else
      if p_newsletter_opt_in and not registration_row.newsletter_preference then
        update public.launch_access_registrations r set
          newsletter_preference=true,
          newsletter_consent_at=checked_at,
          newsletter_consent_version='launch-modal-v1',
          newsletter_subscribed_at=checked_at,
          newsletter_unsubscribed_at=null,
          retention_expires_at=case when campaign_row.state='closed'
            then least(
              coalesce(r.retention_expires_at,campaign_row.updated_at+interval '12 months'),
              campaign_row.updated_at+interval '12 months'
            )
            else r.retention_expires_at end,
          updated_at=checked_at
        where r.id=registration_row.id;
      end if;
      final_outcome := case when p_request_type='newsletter_only'
        then 'newsletter_subscribed' else 'request_received' end;
    end if;
  else
    insert into public.launch_access_registrations(
      campaign_key,email_normalized,registration_type,newsletter_preference,
      newsletter_consent_at,newsletter_consent_version,waitlist_requested_at,
      newsletter_subscribed_at,origin,status,requested_at,retention_expires_at,
      created_at,updated_at
    ) values (
      p_campaign_key,normalized_email,
      case when p_request_type='newsletter_only' then 'newsletter_only' else 'waitlist' end,
      p_newsletter_opt_in,
      case when p_newsletter_opt_in then checked_at else null end,
      case when p_newsletter_opt_in then 'launch-modal-v1' else null end,
      case when p_request_type='waitlist' then checked_at else null end,
      case when p_newsletter_opt_in then checked_at else null end,
      p_origin,case when p_request_type='newsletter_only' then 'subscribed' else 'received' end,
      checked_at,case when campaign_row.state='closed'
        then campaign_row.updated_at+interval '12 months' else null end,
      checked_at,checked_at
    );
    if p_request_type='waitlist' then
      update public.launch_access_campaigns c set
        accepted_requests=c.accepted_requests+1,updated_at=checked_at
      where c.campaign_key=p_campaign_key;
      final_outcome := 'request_received';
    else
      final_outcome := 'newsletter_subscribed';
    end if;
  end if;

  if p_request_type='waitlist' then
    update public.launch_access_campaigns c set
      state=case when c.accepted_requests>=c.total_slots then 'closed' else c.state end,
      registration_enabled=case when c.accepted_requests>=c.total_slots then false else c.registration_enabled end,
      updated_at=checked_at
    where c.campaign_key=p_campaign_key;
  end if;

  insert into public.launch_access_request_receipts(
    campaign_key,request_fingerprint,payload_fingerprint,outcome,created_at,expires_at
  ) values (
    p_campaign_key,p_request_fingerprint,p_payload_fingerprint,final_outcome,
    checked_at,checked_at+interval '7 days'
  );

  return query select final_outcome;
end;
$$;

revoke all on function public.request_launch_access(
  text,text,text,text,text,text,boolean,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.request_launch_access(
  text,text,text,text,text,text,boolean,text,timestamptz
) to service_role;

create or replace function public.purge_launch_access_expired(p_now timestamptz default now())
returns table(registrations_deleted integer,receipts_deleted integer,rate_limits_deleted integer)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  removed_registrations integer;
  removed_receipts integer;
  removed_rate_limits integer;
begin
  if p_now is null then raise exception 'INVALID_LAUNCH_PURGE_TIME'; end if;
  -- Mantiene el mismo orden de locks que request_launch_access: recibos,
  -- límites, campaña y registros. Así el mantenimiento no forma un ciclo con
  -- una solicitud que ya tiene bloqueado su límite por cliente.
  delete from public.launch_access_request_receipts where expires_at<=p_now;
  get diagnostics removed_receipts = row_count;
  delete from public.launch_access_rate_limits where updated_at<=p_now-interval '2 hours';
  get diagnostics removed_rate_limits = row_count;
  -- Cierra campañas vencidas aun cuando no llegue otra solicitud. El trigger
  -- fija el mismo límite máximo de retención para todas sus filas.
  update public.launch_access_campaigns c set
    state='closed',registration_enabled=false,updated_at=c.ends_at
  where c.state<>'closed' and c.ends_at is not null and c.ends_at<=p_now;
  delete from public.launch_access_registrations where retention_expires_at<=p_now;
  get diagnostics removed_registrations = row_count;
  return query select removed_registrations,removed_receipts,removed_rate_limits;
end;
$$;
revoke all on function public.purge_launch_access_expired(timestamptz)
  from public,anon,authenticated;
grant execute on function public.purge_launch_access_expired(timestamptz) to service_role;

-- Fuente de verdad server-side para una baja verificada por Privacidad/PQR.
-- Conserva la evidencia del consentimiento y marca explícitamente su retiro.
create or replace function public.unsubscribe_launch_newsletter(
  p_campaign_key text,
  p_email text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email,'')));
  changed integer;
begin
  if p_now is null then raise exception 'INVALID_LAUNCH_UNSUBSCRIBE_TIME'; end if;
  update public.launch_access_registrations r set
    newsletter_preference=false,
    newsletter_unsubscribed_at=p_now,
    status=case when r.registration_type='newsletter_only' then 'closed' else r.status end,
    updated_at=p_now
  where r.campaign_key=p_campaign_key
    and r.email_normalized=normalized_email
    and r.newsletter_preference
    and r.newsletter_consent_at is not null;
  get diagnostics changed = row_count;
  return changed>0;
end;
$$;
revoke all on function public.unsubscribe_launch_newsletter(text,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.unsubscribe_launch_newsletter(text,text,timestamptz)
  to service_role;

commit;
