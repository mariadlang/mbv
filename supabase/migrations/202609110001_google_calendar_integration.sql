-- Google Calendar is deliberately isolated from the local planner snapshot.
-- These tables are server-only: authenticated browser clients receive no grants.

create table if not exists public.google_calendar_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pkce_verifier_ciphertext text not null,
  return_to text not null default '/app/settings?calendar=connected#integrations',
  completion_token_hash text unique,
  pending_payload_ciphertext text,
  pending_grant_token_ciphertext text,
  expires_at timestamptz not null,
  used_at timestamptz,
  callback_completed_at timestamptz,
  finalizing_at timestamptz,
  finalization_id uuid,
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'),
  account_id text not null,
  email text not null,
  status text not null default 'connecting' check (status in ('connecting','connected','reconnect_required','disconnected')),
  connection_generation uuid,
  selection_generation uuid not null default gen_random_uuid(),
  access_token_ciphertext text,
  refresh_token_ciphertext text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.google_calendar_token_revocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source_key text not null unique,
  token_ciphertext text not null,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connected_calendars (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.calendar_integrations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  external_calendar_id text not null,
  name text not null,
  timezone text,
  color text,
  is_visible boolean not null default false,
  is_writable boolean not null default false,
  is_default boolean not null default false,
  sync_token text,
  channel_id text unique,
  channel_resource_id text,
  channel_token_hash text,
  channel_expires_at timestamptz,
  sync_requested_at timestamptz,
  sync_request_id uuid,
  sync_claim_id uuid,
  sync_claim_request_id uuid,
  sync_claimed_at timestamptz,
  sync_attempt_count integer not null default 0,
  sync_last_error_code text,
  last_webhook_message_number numeric(40,0),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_calendar_id)
);

create unique index if not exists connected_calendars_one_default
  on public.connected_calendars(integration_id) where is_default;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.calendar_integrations(id) on delete cascade,
  connected_calendar_id uuid not null references public.connected_calendars(id) on delete cascade,
  external_calendar_id text not null,
  external_event_id text not null,
  local_event_id text,
  i_cal_uid text,
  title text not null default '(Sin título)',
  description text,
  start_at timestamptz,
  end_at timestamptz,
  start_date date not null,
  end_date date,
  start_time time,
  end_time time,
  timezone text not null default 'UTC',
  all_day boolean not null default false,
  recurrence jsonb not null default '[]'::jsonb,
  recurring_event_id text,
  status text not null default 'confirmed' check (status in ('confirmed','tentative','cancelled')),
  origin text not null default 'google' check (origin in ('google','mbv')),
  etag text,
  google_updated_at timestamptz,
  mbv_updated_at timestamptz,
  last_synced_at timestamptz,
  sync_state text not null default 'synced' check (sync_state in ('pending','synced','error','conflict','reconnect_required')),
  pending_action text check (pending_action is null or pending_action in ('create','update','delete')),
  operation_id uuid,
  conflict jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_calendar_id, external_event_id)
);

create unique index if not exists calendar_events_local_link
  on public.calendar_events(user_id, local_event_id) where local_event_id is not null;
create index if not exists calendar_events_visible_window
  on public.calendar_events(user_id, start_date, status);
create index if not exists connected_calendars_watch_lookup
  on public.connected_calendars(channel_id, channel_resource_id);
create index if not exists connected_calendars_pending_sync
  on public.connected_calendars(sync_requested_at) where sync_requested_at is not null;
create index if not exists google_calendar_oauth_states_expiry
  on public.google_calendar_oauth_states(expires_at) where used_at is null;
create index if not exists google_calendar_oauth_states_all_expiry
  on public.google_calendar_oauth_states(expires_at);
create unique index if not exists google_calendar_oauth_states_one_open_per_user
  on public.google_calendar_oauth_states(user_id) where finalized_at is null;
create index if not exists google_calendar_token_revocations_due
  on public.google_calendar_token_revocations(next_attempt_at, created_at);

create or replace function public.touch_calendar_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Applies one Google API page in a single database round-trip. The row lock and
-- conditional upsert preserve a newer MBV outbox operation that may arrive
-- while a pull is in progress.
create or replace function public.apply_google_calendar_sync_batch(
  p_user_id uuid,
  p_integration_id uuid,
  p_connection_generation uuid,
  p_selection_generation uuid,
  p_connected_calendar_id uuid,
  p_external_calendar_id text,
  p_events jsonb,
  p_synced_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  current_event public.calendar_events%rowtype;
  previous_link public.calendar_events%rowtype;
  incoming_updated timestamptz;
  incoming_local_id text;
begin
  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'INVALID_CALENDAR_SYNC_BATCH';
  end if;
  perform 1
    from public.calendar_integrations i
    join public.connected_calendars c on c.integration_id = i.id
    where i.id = p_integration_id
      and i.user_id = p_user_id
      and i.connection_generation is not distinct from p_connection_generation
      and i.selection_generation = p_selection_generation
      and i.status = 'connected'
      and c.id = p_connected_calendar_id
      and c.user_id = p_user_id
      and c.external_calendar_id = p_external_calendar_id
      and c.is_visible
    for update of i, c;
  if not found then
    raise exception 'CALENDAR_CONNECTION_CHANGED' using errcode = 'P0001';
  end if;

  for item in select value from jsonb_array_elements(p_events)
  loop
    if coalesce(item->>'externalEventId', '') = '' then
      continue;
    end if;

    select * into current_event
      from public.calendar_events
      where integration_id = p_integration_id
        and external_calendar_id = p_external_calendar_id
        and external_event_id = item->>'externalEventId'
      for update;

    incoming_updated := nullif(item->>'googleUpdatedAt', '')::timestamptz;

    if coalesce((item->>'tombstone')::boolean, false) then
      if found then
        if current_event.pending_action is not null and current_event.pending_action <> 'delete' then
          update public.calendar_events set
            sync_state = 'conflict',
            conflict = jsonb_build_object(
              'id', gen_random_uuid(),
              'detectedAt', p_synced_at,
              'google', item,
              'mbv', jsonb_build_object(
                'title', current_event.title,
                'description', current_event.description,
                'startDate', current_event.start_date,
                'endDate', current_event.end_date,
                'timezone', current_event.timezone,
                'allDay', current_event.all_day
              )
            )
          where id = current_event.id;
        else
          update public.calendar_events set
            status = 'cancelled',
            etag = nullif(item->>'etag', ''),
            google_updated_at = coalesce(incoming_updated, p_synced_at),
            last_synced_at = p_synced_at,
            sync_state = 'synced',
            pending_action = null,
            operation_id = null,
            conflict = null
          where id = current_event.id;
        end if;
      end if;
      continue;
    end if;

    if found and current_event.pending_action is not null then
      if current_event.last_synced_at is not null
        and incoming_updated is not null
        and incoming_updated > current_event.last_synced_at then
        update public.calendar_events set
          sync_state = 'conflict',
          conflict = jsonb_build_object(
            'id', gen_random_uuid(),
            'detectedAt', p_synced_at,
            'google', item,
            'mbv', jsonb_build_object(
              'title', current_event.title,
              'description', current_event.description,
              'startDate', current_event.start_date,
              'endDate', current_event.end_date,
              'timezone', current_event.timezone,
              'allDay', current_event.all_day
            )
          )
        where id = current_event.id;
      end if;
      continue;
    end if;

    incoming_local_id := nullif(item->>'localEventId', '');
    if incoming_local_id is not null then
      select * into previous_link
        from public.calendar_events
        where user_id = p_user_id
          and local_event_id = incoming_local_id
          and not (
            integration_id = p_integration_id
            and external_calendar_id = p_external_calendar_id
            and external_event_id = item->>'externalEventId'
          )
        for update;
      if found then
        if previous_link.pending_action is null and previous_link.sync_state <> 'conflict' then
          update public.calendar_events set
            local_event_id = null,
            status = 'cancelled',
            sync_state = 'synced',
            operation_id = null,
            conflict = null,
            last_synced_at = p_synced_at
          where id = previous_link.id;
        else
          update public.calendar_events set
            sync_state = 'conflict',
            conflict = jsonb_build_object(
              'id', gen_random_uuid(),
              'detectedAt', p_synced_at,
              'google', item,
              'mbv', jsonb_build_object(
                'title', previous_link.title,
                'description', previous_link.description,
                'startDate', previous_link.start_date,
                'endDate', previous_link.end_date,
                'timezone', previous_link.timezone,
                'allDay', previous_link.all_day
              )
            )
          where id = previous_link.id;
          item := item - 'localEventId';
          incoming_local_id := null;
        end if;
      end if;
    end if;

    insert into public.calendar_events (
      user_id, integration_id, connected_calendar_id, external_calendar_id,
      external_event_id, local_event_id, i_cal_uid, title, description,
      start_at, end_at, start_date, end_date, start_time, end_time, timezone,
      all_day, recurrence, recurring_event_id, status, origin, etag,
      google_updated_at, last_synced_at, sync_state, pending_action,
      operation_id, conflict
    ) values (
      p_user_id, p_integration_id, p_connected_calendar_id, p_external_calendar_id,
      item->>'externalEventId', incoming_local_id, nullif(item->>'iCalUid', ''),
      coalesce(nullif(item->>'title', ''), '(Sin título)'), nullif(item->>'description', ''),
      nullif(item->>'startAt', '')::timestamptz, nullif(item->>'endAt', '')::timestamptz,
      (item->>'startDate')::date, coalesce(nullif(item->>'endDate', '')::date, (item->>'startDate')::date),
      nullif(item->>'startTime', '')::time, nullif(item->>'endTime', '')::time,
      coalesce(nullif(item->>'timezone', ''), 'UTC'), coalesce((item->>'allDay')::boolean, false),
      coalesce(item->'recurrence', '[]'::jsonb), nullif(item->>'recurringEventId', ''),
      case when item->>'status' in ('confirmed', 'tentative', 'cancelled') then item->>'status' else 'confirmed' end,
      case when item->>'origin' = 'mbv' then 'mbv' else 'google' end,
      nullif(item->>'etag', ''), coalesce(incoming_updated, p_synced_at), p_synced_at,
      'synced', null, null, null
    )
    on conflict (integration_id, external_calendar_id, external_event_id)
    do update set
      connected_calendar_id = excluded.connected_calendar_id,
      local_event_id = excluded.local_event_id,
      i_cal_uid = excluded.i_cal_uid,
      title = excluded.title,
      description = excluded.description,
      start_at = excluded.start_at,
      end_at = excluded.end_at,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      timezone = excluded.timezone,
      all_day = excluded.all_day,
      recurrence = excluded.recurrence,
      recurring_event_id = excluded.recurring_event_id,
      status = excluded.status,
      origin = excluded.origin,
      etag = excluded.etag,
      google_updated_at = excluded.google_updated_at,
      last_synced_at = excluded.last_synced_at,
      sync_state = 'synced',
      pending_action = null,
      operation_id = null,
      conflict = null
    where public.calendar_events.pending_action is null
      and public.calendar_events.operation_id is null
      and public.calendar_events.sync_state <> 'conflict';
  end loop;
end;
$$;

create or replace function public.enqueue_google_calendar_webhook_sync(
  p_channel_id text,
  p_resource_id text,
  p_channel_token_hash text,
  p_message_number numeric
)
returns table(calendar_id uuid, request_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.connected_calendars%rowtype;
  next_request_id uuid;
begin
  select c.* into target
    from public.connected_calendars c
    join public.calendar_integrations i on i.id = c.integration_id
    where c.channel_id = p_channel_id
      and c.channel_resource_id = p_resource_id
      and c.channel_token_hash = p_channel_token_hash
      and c.is_visible = true
      and i.status = 'connected'
    for update of c;
  if not found then return; end if;

  if target.last_webhook_message_number is not null
    and p_message_number <= target.last_webhook_message_number then
    return query select target.id, target.sync_request_id;
    return;
  end if;

  next_request_id := gen_random_uuid();
  update public.connected_calendars set
    last_webhook_message_number = p_message_number,
    sync_request_id = next_request_id,
    sync_requested_at = now(),
    sync_last_error_code = null
  where id = target.id;
  return query select target.id, next_request_id;
end;
$$;

create or replace function public.enqueue_google_calendar_manual_sync(p_calendar_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_request_id uuid := gen_random_uuid();
begin
  update public.connected_calendars c set
    sync_request_id = next_request_id,
    sync_requested_at = now(),
    sync_last_error_code = null
  from public.calendar_integrations i
  where c.id = p_calendar_id
    and i.id = c.integration_id
    and c.is_visible = true
    and i.status = 'connected';
  if not found then return null; end if;
  return next_request_id;
end;
$$;

create or replace function public.claim_google_calendar_sync(p_calendar_id uuid)
returns table(claim_id uuid, request_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.connected_calendars%rowtype;
  next_claim_id uuid;
begin
  select * into target from public.connected_calendars where id = p_calendar_id for update;
  if not found or target.sync_request_id is null then return; end if;
  if target.sync_claim_id is not null
    and target.sync_claimed_at is not null
    and target.sync_claimed_at > now() - interval '90 seconds' then
    return;
  end if;
  next_claim_id := gen_random_uuid();
  update public.connected_calendars set
    sync_claim_id = next_claim_id,
    sync_claim_request_id = target.sync_request_id,
    sync_claimed_at = now(),
    sync_attempt_count = sync_attempt_count + 1
  where id = target.id;
  return query select next_claim_id, target.sync_request_id;
end;
$$;

create or replace function public.complete_google_calendar_sync(
  p_calendar_id uuid,
  p_claim_id uuid,
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.connected_calendars%rowtype;
begin
  select * into target from public.connected_calendars where id = p_calendar_id for update;
  if not found or target.sync_claim_id is distinct from p_claim_id
    or target.sync_claim_request_id is distinct from p_request_id then return false; end if;
  update public.connected_calendars set
    sync_request_id = case when sync_request_id = p_request_id then null else sync_request_id end,
    sync_requested_at = case when sync_request_id = p_request_id then null else sync_requested_at end,
    sync_claim_id = null,
    sync_claim_request_id = null,
    sync_claimed_at = null,
    sync_attempt_count = case when sync_request_id = p_request_id then 0 else sync_attempt_count end,
    sync_last_error_code = null
  where id = p_calendar_id;
  return true;
end;
$$;

create or replace function public.release_google_calendar_sync(
  p_calendar_id uuid,
  p_claim_id uuid,
  p_request_id uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.connected_calendars set
    sync_claim_id = null,
    sync_claim_request_id = null,
    sync_claimed_at = null,
    sync_last_error_code = left(coalesce(p_error_code, 'SYNC_FAILED'), 120),
    sync_requested_at = coalesce(sync_requested_at, now())
  where id = p_calendar_id
    and sync_claim_id = p_claim_id
    and sync_claim_request_id = p_request_id;
  return found;
end;
$$;

create or replace function public.claim_google_calendar_oauth_completion(
  p_user_id uuid,
  p_completion_token_hash text,
  p_finalization_id uuid,
  p_now timestamptz
)
returns setof public.google_calendar_oauth_states
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.google_calendar_oauth_states as s set
    finalizing_at = p_now,
    finalization_id = p_finalization_id
  where s.user_id = p_user_id
    and s.completion_token_hash = p_completion_token_hash
    and s.used_at is not null
    and s.callback_completed_at is not null
    and s.pending_payload_ciphertext is not null
    and s.finalized_at is null
    and s.expires_at > p_now
    and (s.finalizing_at is null or s.finalizing_at < p_now - interval '2 minutes')
  returning s.*;
$$;

create or replace function public.activate_google_calendar_connection(
  p_user_id uuid,
  p_state_hash text,
  p_finalization_id uuid,
  p_account_id text,
  p_email text,
  p_access_token_ciphertext text,
  p_refresh_token_ciphertext text,
  p_token_expires_at timestamptz,
  p_scopes text[],
  p_calendars jsonb,
  p_finalized_at timestamptz
)
returns setof public.calendar_integrations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  oauth_state public.google_calendar_oauth_states%rowtype;
  existing_integration public.calendar_integrations%rowtype;
  active_integration public.calendar_integrations%rowtype;
  calendar_item jsonb;
  remote_calendar_ids text[] := '{}';
  account_changed boolean := false;
begin
  if jsonb_typeof(p_calendars) is distinct from 'array' or jsonb_array_length(p_calendars) > 1000 then
    raise exception 'INVALID_CALENDAR_LIST' using errcode = 'P0001';
  end if;

  select * into oauth_state
    from public.google_calendar_oauth_states
    where state_hash = p_state_hash
      and user_id = p_user_id
      and finalization_id = p_finalization_id
      and finalizing_at is not null
      and finalized_at is null
      and pending_payload_ciphertext is not null
      and expires_at > now()
    for update;
  if not found then return; end if;

  select * into existing_integration
    from public.calendar_integrations
    where user_id = p_user_id and provider = 'google'
    for update;

  account_changed := existing_integration.id is not null
    and existing_integration.account_id <> p_account_id;

  if account_changed then
    if exists (
      select 1 from public.calendar_events
      where integration_id = existing_integration.id
        and (pending_action is not null or operation_id is not null or sync_state in ('pending', 'conflict'))
    ) then
      raise exception 'CALENDAR_PENDING_CHANGES' using errcode = 'P0001';
    end if;
    insert into public.google_calendar_token_revocations (
      user_id, source_key, token_ciphertext
    ) values (
      p_user_id,
      'integration:' || existing_integration.id::text || ':' || coalesce(existing_integration.connection_generation::text, 'initial'),
      existing_integration.refresh_token_ciphertext
    ) on conflict (source_key) do nothing;
    delete from public.connected_calendars where integration_id = existing_integration.id;
  end if;

  insert into public.calendar_integrations (
    user_id, provider, account_id, email, status, connection_generation, selection_generation,
    access_token_ciphertext, refresh_token_ciphertext, token_expires_at,
    scopes, last_error_code
  ) values (
    p_user_id, 'google', p_account_id, p_email, 'connected', p_finalization_id, gen_random_uuid(),
    p_access_token_ciphertext, p_refresh_token_ciphertext, p_token_expires_at,
    p_scopes, null
  )
  on conflict (user_id, provider) do update set
    account_id = excluded.account_id,
    email = excluded.email,
    status = 'connected',
    connection_generation = excluded.connection_generation,
    selection_generation = case
      when public.calendar_integrations.account_id <> excluded.account_id then gen_random_uuid()
      else public.calendar_integrations.selection_generation
    end,
    access_token_ciphertext = excluded.access_token_ciphertext,
    refresh_token_ciphertext = excluded.refresh_token_ciphertext,
    token_expires_at = excluded.token_expires_at,
    scopes = excluded.scopes,
    last_error_code = null
  returning * into active_integration;

  for calendar_item in select value from jsonb_array_elements(p_calendars)
  loop
    if jsonb_typeof(calendar_item->'id') is distinct from 'string'
      or btrim(coalesce(calendar_item->>'id', '')) = ''
      or length(calendar_item->>'id') > 1024 then
      raise exception 'INVALID_CALENDAR_LIST' using errcode = 'P0001';
    end if;
    if not ((calendar_item->>'id') = any(remote_calendar_ids)) then
      remote_calendar_ids := array_append(remote_calendar_ids, calendar_item->>'id');
    end if;
  end loop;

  if not account_changed and existing_integration.id is not null and exists (
    select 1
    from public.calendar_events e
    join public.connected_calendars c on c.id = e.connected_calendar_id
    where e.integration_id = active_integration.id
      and not (c.external_calendar_id = any(remote_calendar_ids))
      and (e.pending_action is not null or e.operation_id is not null or e.sync_state in ('pending', 'conflict'))
  ) then
    raise exception 'CALENDAR_PENDING_CHANGES' using errcode = 'P0001';
  end if;

  for calendar_item in select value from jsonb_array_elements(p_calendars)
  loop
    insert into public.connected_calendars (
      integration_id, user_id, external_calendar_id, name, timezone, color,
      is_visible, is_writable, is_default
    ) values (
      active_integration.id,
      p_user_id,
      calendar_item->>'id',
      left(coalesce(nullif(btrim(calendar_item->>'summary'), ''), calendar_item->>'id'), 4096),
      nullif(left(coalesce(calendar_item->>'timeZone', ''), 255), ''),
      nullif(left(coalesce(calendar_item->>'backgroundColor', ''), 64), ''),
      false,
      coalesce(calendar_item->>'accessRole', '') in ('writerWithoutPrivateAccess', 'writer', 'owner'),
      false
    )
    on conflict (integration_id, external_calendar_id) do update set
      name = excluded.name,
      timezone = excluded.timezone,
      color = excluded.color,
      is_writable = excluded.is_writable,
      is_default = public.connected_calendars.is_default and excluded.is_writable;
  end loop;

  delete from public.connected_calendars
    where integration_id = active_integration.id
      and not (external_calendar_id = any(remote_calendar_ids));

  update public.google_calendar_oauth_states set
    pending_payload_ciphertext = null,
    pending_grant_token_ciphertext = null,
    finalizing_at = null,
    finalization_id = null,
    finalized_at = p_finalized_at
  where state_hash = p_state_hash
    and user_id = p_user_id
    and finalization_id = p_finalization_id;
  if not found then
    raise exception 'INVALID_CALENDAR_COMPLETION' using errcode = 'P0001';
  end if;

  return next active_integration;
  return;
end;
$$;

create or replace function public.finish_google_calendar_oauth_completion(
  p_user_id uuid,
  p_state_hash text,
  p_finalization_id uuid,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  oauth_state public.google_calendar_oauth_states%rowtype;
begin
  select * into oauth_state
    from public.google_calendar_oauth_states
    where state_hash = p_state_hash
      and user_id = p_user_id
      and finalization_id = p_finalization_id
      and finalizing_at is not null
      and finalized_at is null
      and pending_payload_ciphertext is not null
      and expires_at > p_now
    for update;
  if not found then return false; end if;

  update public.calendar_integrations set status = 'connected'
    where user_id = p_user_id
      and provider = 'google'
      and connection_generation = p_finalization_id;
  if not found then return false; end if;

  update public.google_calendar_oauth_states set
    pending_payload_ciphertext = null,
    pending_grant_token_ciphertext = null,
    finalizing_at = null,
    finalization_id = null,
    finalized_at = p_now
  where state_hash = p_state_hash
    and user_id = p_user_id;
  return true;
end;
$$;

create or replace function public.release_google_calendar_oauth_completion(
  p_user_id uuid,
  p_state_hash text,
  p_finalization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.google_calendar_oauth_states set finalizing_at = null, finalization_id = null
    where state_hash = p_state_hash
      and user_id = p_user_id
      and finalization_id = p_finalization_id
      and finalized_at is null
      and pending_payload_ciphertext is not null;
  return found;
end;
$$;

create or replace function public.cleanup_google_calendar_oauth_states(
  p_user_id uuid,
  p_expired_before timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  oauth_state public.google_calendar_oauth_states%rowtype;
  cleaned integer := 0;
begin
  for oauth_state in
    select s.*
    from public.google_calendar_oauth_states s
    where (p_user_id is null or s.user_id = p_user_id)
      and (p_expired_before is null or s.expires_at < p_expired_before)
    for update
  loop
    if oauth_state.pending_grant_token_ciphertext is not null then
      insert into public.google_calendar_token_revocations (
        user_id, source_key, token_ciphertext
      ) values (
        oauth_state.user_id,
        'oauth-state:' || oauth_state.state_hash,
        oauth_state.pending_grant_token_ciphertext
      ) on conflict (source_key) do nothing;
    end if;
    delete from public.google_calendar_oauth_states where state_hash = oauth_state.state_hash;
    cleaned := cleaned + 1;
  end loop;
  return cleaned;
end;
$$;

create or replace function public.rotate_google_calendar_oauth_state(
  p_user_id uuid,
  p_state_hash text,
  p_pkce_verifier_ciphertext text,
  p_return_to text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  perform public.cleanup_google_calendar_oauth_states(p_user_id, null);
  insert into public.google_calendar_oauth_states (
    state_hash, user_id, pkce_verifier_ciphertext, return_to, expires_at
  ) values (
    p_state_hash, p_user_id, p_pkce_verifier_ciphertext, p_return_to, p_expires_at
  );
  return true;
end;
$$;

create or replace function public.disconnect_google_calendar_connection(
  p_user_id uuid,
  p_connection_generation uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  integration public.calendar_integrations%rowtype;
begin
  -- Keep lock ordering aligned with OAuth completion: states, then integration.
  perform public.cleanup_google_calendar_oauth_states(p_user_id, null);
  select * into integration
    from public.calendar_integrations
    where user_id = p_user_id and provider = 'google'
      and connection_generation is not distinct from p_connection_generation
    for update;
  if not found then return false; end if;

  insert into public.google_calendar_token_revocations (
    user_id, source_key, token_ciphertext
  ) values (
    p_user_id,
    'disconnect:' || integration.id::text || ':' || coalesce(integration.connection_generation::text, 'initial'),
    integration.refresh_token_ciphertext
  ) on conflict (source_key) do nothing;

  delete from public.calendar_integrations where id = integration.id;
  return true;
end;
$$;

create or replace function public.configure_google_calendar_selection(
  p_user_id uuid,
  p_integration_id uuid,
  p_connection_generation uuid,
  p_selection_generation uuid,
  p_visible_calendar_ids uuid[],
  p_default_calendar_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  integration public.calendar_integrations%rowtype;
  distinct_count integer;
  next_generation uuid := gen_random_uuid();
begin
  if coalesce(cardinality(p_visible_calendar_ids), 0) = 0
    or coalesce(cardinality(p_visible_calendar_ids), 0) > 50
    or not (p_default_calendar_id = any(p_visible_calendar_ids)) then
    raise exception 'INVALID_CALENDAR_SELECTION' using errcode = 'P0001';
  end if;
  select count(distinct selected_id) into distinct_count
    from unnest(p_visible_calendar_ids) as selected(selected_id);
  if distinct_count <> cardinality(p_visible_calendar_ids) then
    raise exception 'INVALID_CALENDAR_SELECTION' using errcode = 'P0001';
  end if;

  select * into integration
    from public.calendar_integrations
    where id = p_integration_id
      and user_id = p_user_id
      and provider = 'google'
      and status = 'connected'
      and connection_generation is not distinct from p_connection_generation
      and selection_generation = p_selection_generation
    for update;
  if not found then
    raise exception 'CALENDAR_CONNECTION_CHANGED' using errcode = 'P0001';
  end if;

  perform 1 from public.connected_calendars
    where integration_id = integration.id
    for update;
  if exists (
    select 1 from unnest(p_visible_calendar_ids) as selected(selected_id)
    where not exists (
      select 1 from public.connected_calendars c
      where c.id = selected.selected_id and c.integration_id = integration.id and c.user_id = p_user_id
    )
  ) then
    raise exception 'INVALID_CALENDAR_SELECTION' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.connected_calendars c
    where c.id = p_default_calendar_id
      and c.integration_id = integration.id
      and c.user_id = p_user_id
      and c.is_writable
  ) then
    raise exception 'INVALID_DEFAULT_CALENDAR' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.calendar_events e
    join public.connected_calendars c on c.id = e.connected_calendar_id
    where e.integration_id = integration.id
      and not (c.id = any(p_visible_calendar_ids))
      and (e.pending_action is not null or e.operation_id is not null or e.sync_state in ('pending', 'conflict'))
  ) then
    raise exception 'CALENDAR_PENDING_CHANGES' using errcode = 'P0001';
  end if;

  delete from public.calendar_events e
    where e.integration_id = integration.id
      and not (e.connected_calendar_id = any(p_visible_calendar_ids));
  -- The partial unique index is immediate, so clear the previous default
  -- before activating another one within this same transaction.
  update public.connected_calendars c set is_default = false
    where c.integration_id = integration.id and c.is_default;
  update public.connected_calendars c set
    is_visible = c.id = any(p_visible_calendar_ids),
    is_default = c.id = p_default_calendar_id,
    sync_token = case when c.id = any(p_visible_calendar_ids) then c.sync_token else null end,
    channel_id = case when c.id = any(p_visible_calendar_ids) then c.channel_id else null end,
    channel_resource_id = case when c.id = any(p_visible_calendar_ids) then c.channel_resource_id else null end,
    channel_token_hash = case when c.id = any(p_visible_calendar_ids) then c.channel_token_hash else null end,
    channel_expires_at = case when c.id = any(p_visible_calendar_ids) then c.channel_expires_at else null end,
    sync_requested_at = case when c.id = any(p_visible_calendar_ids) then c.sync_requested_at else null end,
    sync_request_id = case when c.id = any(p_visible_calendar_ids) then c.sync_request_id else null end,
    sync_claim_id = case when c.id = any(p_visible_calendar_ids) then c.sync_claim_id else null end,
    sync_claim_request_id = case when c.id = any(p_visible_calendar_ids) then c.sync_claim_request_id else null end,
    sync_claimed_at = case when c.id = any(p_visible_calendar_ids) then c.sync_claimed_at else null end,
    sync_attempt_count = case when c.id = any(p_visible_calendar_ids) then c.sync_attempt_count else 0 end,
    sync_last_error_code = case when c.id = any(p_visible_calendar_ids) then c.sync_last_error_code else null end
  where c.integration_id = integration.id;
  update public.calendar_integrations set selection_generation = next_generation
    where id = integration.id;
  return next_generation;
end;
$$;

create or replace function public.stage_google_calendar_event_operation(
  p_user_id uuid,
  p_integration_id uuid,
  p_connection_generation uuid,
  p_selection_generation uuid,
  p_connected_calendar_id uuid,
  p_external_event_id text,
  p_local_event_id text,
  p_action text,
  p_event jsonb,
  p_operation_id uuid,
  p_now timestamptz,
  p_expected_etag text
)
returns table(row_id uuid, operation_id uuid, row_created boolean, conflicted boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  integration public.calendar_integrations%rowtype;
  calendar public.connected_calendars%rowtype;
  staged public.calendar_events%rowtype;
  created boolean := false;
begin
  if p_action not in ('create', 'update', 'delete') then
    raise exception 'INVALID_CALENDAR_OPERATION' using errcode = 'P0001';
  end if;
  select * into integration
    from public.calendar_integrations
    where id = p_integration_id
      and user_id = p_user_id
      and provider = 'google'
      and status = 'connected'
      and connection_generation is not distinct from p_connection_generation
      and selection_generation = p_selection_generation
    for update;
  if not found then
    raise exception 'CALENDAR_CONNECTION_CHANGED' using errcode = 'P0001';
  end if;
  select * into calendar
    from public.connected_calendars
    where id = p_connected_calendar_id
      and integration_id = integration.id
      and user_id = p_user_id
      and is_visible
      and is_writable
    for update;
  if not found then
    raise exception 'CALENDAR_NOT_WRITABLE' using errcode = 'P0001';
  end if;

  select * into staged
    from public.calendar_events
    where integration_id = integration.id
      and external_calendar_id = calendar.external_calendar_id
      and external_event_id = p_external_event_id
    for update;

  if found then
    if staged.user_id <> p_user_id or staged.origin <> 'mbv' or staged.local_event_id is distinct from p_local_event_id then
      raise exception 'GOOGLE_EVENT_ID_COLLISION' using errcode = 'P0001';
    end if;
    if staged.operation_id is not null
      and greatest(coalesce(staged.mbv_updated_at, '-infinity'::timestamptz), staged.updated_at) > p_now - interval '10 minutes' then
      raise exception 'CALENDAR_EVENT_OPERATION_IN_PROGRESS' using errcode = 'P0001';
    end if;
    if staged.sync_state = 'conflict' and staged.conflict is not null then
      return query select staged.id, p_operation_id, false, true;
      return;
    end if;
    if p_action in ('update', 'delete')
      and staged.pending_action is distinct from 'create'
      and (p_expected_etag is null or staged.etag is null or staged.etag <> p_expected_etag) then
      update public.calendar_events set
        mbv_updated_at = p_now,
        sync_state = 'conflict',
        pending_action = p_action,
        operation_id = null,
        conflict = jsonb_build_object(
          'id', gen_random_uuid(),
          'detectedAt', p_now,
          'google', jsonb_strip_nulls(jsonb_build_object(
            'externalEventId', staged.external_event_id,
            'title', staged.title,
            'description', staged.description,
            'startDate', to_char(staged.start_date, 'YYYY-MM-DD'),
            'endDate', case when staged.end_date is distinct from staged.start_date then to_char(staged.end_date, 'YYYY-MM-DD') end,
            'startTime', case when staged.start_time is not null then to_char(staged.start_time, 'HH24:MI') end,
            'endTime', case when staged.end_time is not null then to_char(staged.end_time, 'HH24:MI') end,
            'timezone', staged.timezone,
            'allDay', staged.all_day,
            'status', staged.status
          )),
          'mbv', p_event
        )
      where id = staged.id
      returning * into staged;
      return query select staged.id, p_operation_id, false, true;
      return;
    end if;
    update public.calendar_events set
      connected_calendar_id = calendar.id,
      title = left(p_event->>'title', 500),
      description = nullif(p_event->>'description', ''),
      start_date = (p_event->>'startDate')::date,
      end_date = coalesce(nullif(p_event->>'endDate', '')::date, (p_event->>'startDate')::date),
      start_time = case when coalesce((p_event->>'allDay')::boolean, false) then null else nullif(p_event->>'startTime', '')::time end,
      end_time = case when coalesce((p_event->>'allDay')::boolean, false) then null else nullif(p_event->>'endTime', '')::time end,
      timezone = left(p_event->>'timezone', 100),
      all_day = coalesce((p_event->>'allDay')::boolean, false),
      status = case when p_action = 'create' then 'confirmed' else staged.status end,
      origin = 'mbv',
      mbv_updated_at = p_now,
      sync_state = 'pending',
      pending_action = p_action,
      operation_id = p_operation_id
    where id = staged.id
    returning * into staged;
  else
    if p_action <> 'create' then
      raise exception 'CALENDAR_EVENT_NOT_LINKED' using errcode = 'P0001';
    end if;
    insert into public.calendar_events (
      user_id, integration_id, connected_calendar_id, external_calendar_id,
      external_event_id, local_event_id, title, description, start_date, end_date,
      start_time, end_time, timezone, all_day, status, origin, mbv_updated_at,
      sync_state, pending_action, operation_id
    ) values (
      p_user_id, integration.id, calendar.id, calendar.external_calendar_id,
      p_external_event_id, p_local_event_id, left(p_event->>'title', 500),
      nullif(p_event->>'description', ''), (p_event->>'startDate')::date,
      coalesce(nullif(p_event->>'endDate', '')::date, (p_event->>'startDate')::date),
      case when coalesce((p_event->>'allDay')::boolean, false) then null else nullif(p_event->>'startTime', '')::time end,
      case when coalesce((p_event->>'allDay')::boolean, false) then null else nullif(p_event->>'endTime', '')::time end,
      left(p_event->>'timezone', 100), coalesce((p_event->>'allDay')::boolean, false),
      'confirmed', 'mbv', p_now, 'pending', p_action, p_operation_id
    ) returning * into staged;
    created := true;
  end if;
  return query select staged.id, p_operation_id, created, false;
end;
$$;

create or replace function public.claim_google_calendar_event_operation(
  p_user_id uuid,
  p_integration_id uuid,
  p_connection_generation uuid,
  p_selection_generation uuid,
  p_event_id uuid,
  p_expected_conflict_id uuid,
  p_operation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  integration public.calendar_integrations%rowtype;
  event_row public.calendar_events%rowtype;
begin
  select * into integration from public.calendar_integrations
    where id = p_integration_id and user_id = p_user_id and status = 'connected'
      and connection_generation is not distinct from p_connection_generation
      and selection_generation = p_selection_generation
    for update;
  if not found then raise exception 'CALENDAR_CONNECTION_CHANGED' using errcode = 'P0001'; end if;
  select * into event_row from public.calendar_events
    where id = p_event_id and integration_id = integration.id and user_id = p_user_id
      and sync_state = 'conflict' and conflict is not null
      and conflict->>'id' = p_expected_conflict_id::text
      and (operation_id is null or updated_at < now() - interval '10 minutes')
    for update;
  if not found then return false; end if;
  perform 1 from public.connected_calendars c
    where c.id = event_row.connected_calendar_id and c.integration_id = integration.id
      and c.is_visible and c.is_writable
    for update;
  if not found then
    raise exception 'CALENDAR_NOT_WRITABLE' using errcode = 'P0001';
  end if;
  update public.calendar_events set operation_id = p_operation_id
    where id = event_row.id;
  return true;
end;
$$;

create or replace function public.commit_google_calendar_sync_run(
  p_user_id uuid,
  p_integration_id uuid,
  p_connection_generation uuid,
  p_selection_generation uuid,
  p_connected_calendar_id uuid,
  p_external_calendar_id text,
  p_sync_started_at timestamptz,
  p_stale_event_ids uuid[],
  p_sync_token text,
  p_synced_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform 1
    from public.calendar_integrations i
    join public.connected_calendars c on c.integration_id = i.id
    where i.id = p_integration_id
      and i.user_id = p_user_id
      and i.status = 'connected'
      and i.connection_generation is not distinct from p_connection_generation
      and i.selection_generation = p_selection_generation
      and c.id = p_connected_calendar_id
      and c.user_id = p_user_id
      and c.external_calendar_id = p_external_calendar_id
      and c.is_visible
    for update of i, c;
  if not found then return false; end if;
  update public.calendar_events set
    status = 'cancelled',
    sync_state = 'synced',
    pending_action = null,
    operation_id = null,
    conflict = null,
    google_updated_at = p_synced_at,
    last_synced_at = p_synced_at
  where integration_id = p_integration_id
    and connected_calendar_id = p_connected_calendar_id
    and user_id = p_user_id
    and id = any(coalesce(p_stale_event_ids, '{}'::uuid[]))
    and pending_action is null
    and operation_id is null
    and sync_state <> 'conflict'
    and (last_synced_at is null or last_synced_at < p_sync_started_at);
  update public.connected_calendars set sync_token = p_sync_token, last_synced_at = p_synced_at
    where id = p_connected_calendar_id;
  update public.calendar_integrations set last_synced_at = p_synced_at, last_error_code = null
    where id = p_integration_id;
  return true;
end;
$$;

create or replace function public.store_google_calendar_watch(
  p_user_id uuid,
  p_integration_id uuid,
  p_connection_generation uuid,
  p_selection_generation uuid,
  p_connected_calendar_id uuid,
  p_external_calendar_id text,
  p_channel_id text,
  p_channel_resource_id text,
  p_channel_token_hash text,
  p_channel_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform 1
    from public.calendar_integrations i
    join public.connected_calendars c on c.integration_id = i.id
    where i.id = p_integration_id
      and i.user_id = p_user_id
      and i.status = 'connected'
      and i.connection_generation is not distinct from p_connection_generation
      and i.selection_generation = p_selection_generation
      and c.id = p_connected_calendar_id
      and c.user_id = p_user_id
      and c.external_calendar_id = p_external_calendar_id
      and c.is_visible
    for update of i, c;
  if not found then return false; end if;
  update public.connected_calendars set
    channel_id = p_channel_id,
    channel_resource_id = p_channel_resource_id,
    channel_token_hash = p_channel_token_hash,
    channel_expires_at = p_channel_expires_at
  where id = p_connected_calendar_id;
  return true;
end;
$$;

drop trigger if exists calendar_integrations_touch_updated_at on public.calendar_integrations;
create trigger calendar_integrations_touch_updated_at before update on public.calendar_integrations
for each row execute procedure public.touch_calendar_updated_at();

drop trigger if exists connected_calendars_touch_updated_at on public.connected_calendars;
create trigger connected_calendars_touch_updated_at before update on public.connected_calendars
for each row execute procedure public.touch_calendar_updated_at();

drop trigger if exists calendar_events_touch_updated_at on public.calendar_events;
create trigger calendar_events_touch_updated_at before update on public.calendar_events
for each row execute procedure public.touch_calendar_updated_at();

drop trigger if exists google_calendar_token_revocations_touch_updated_at on public.google_calendar_token_revocations;
create trigger google_calendar_token_revocations_touch_updated_at before update on public.google_calendar_token_revocations
for each row execute procedure public.touch_calendar_updated_at();

alter table public.google_calendar_oauth_states enable row level security;
alter table public.calendar_integrations enable row level security;
alter table public.connected_calendars enable row level security;
alter table public.calendar_events enable row level security;
alter table public.google_calendar_token_revocations enable row level security;

revoke all on public.google_calendar_oauth_states from anon, authenticated;
revoke all on public.calendar_integrations from anon, authenticated;
revoke all on public.connected_calendars from anon, authenticated;
revoke all on public.calendar_events from anon, authenticated;
revoke all on public.google_calendar_token_revocations from anon, authenticated;

grant all on public.google_calendar_oauth_states to service_role;
grant all on public.calendar_integrations to service_role;
grant all on public.connected_calendars to service_role;
grant all on public.calendar_events to service_role;
grant all on public.google_calendar_token_revocations to service_role;
revoke all on function public.apply_google_calendar_sync_batch(uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.apply_google_calendar_sync_batch(uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz) to service_role;
revoke all on function public.enqueue_google_calendar_webhook_sync(text,text,text,numeric) from public, anon, authenticated;
revoke all on function public.enqueue_google_calendar_manual_sync(uuid) from public, anon, authenticated;
revoke all on function public.claim_google_calendar_sync(uuid) from public, anon, authenticated;
revoke all on function public.complete_google_calendar_sync(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.release_google_calendar_sync(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.enqueue_google_calendar_webhook_sync(text,text,text,numeric) to service_role;
grant execute on function public.enqueue_google_calendar_manual_sync(uuid) to service_role;
grant execute on function public.claim_google_calendar_sync(uuid) to service_role;
grant execute on function public.complete_google_calendar_sync(uuid,uuid,uuid) to service_role;
grant execute on function public.release_google_calendar_sync(uuid,uuid,uuid,text) to service_role;
revoke all on function public.claim_google_calendar_oauth_completion(uuid,text,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.activate_google_calendar_connection(uuid,text,uuid,text,text,text,text,timestamptz,text[],jsonb,timestamptz) from public, anon, authenticated;
revoke all on function public.finish_google_calendar_oauth_completion(uuid,text,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.release_google_calendar_oauth_completion(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.cleanup_google_calendar_oauth_states(uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.rotate_google_calendar_oauth_state(uuid,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.disconnect_google_calendar_connection(uuid,uuid) from public, anon, authenticated;
revoke all on function public.configure_google_calendar_selection(uuid,uuid,uuid,uuid,uuid[],uuid) from public, anon, authenticated;
revoke all on function public.stage_google_calendar_event_operation(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,uuid,timestamptz,text) from public, anon, authenticated;
revoke all on function public.claim_google_calendar_event_operation(uuid,uuid,uuid,uuid,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.commit_google_calendar_sync_run(uuid,uuid,uuid,uuid,uuid,text,timestamptz,uuid[],text,timestamptz) from public, anon, authenticated;
revoke all on function public.store_google_calendar_watch(uuid,uuid,uuid,uuid,uuid,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.claim_google_calendar_oauth_completion(uuid,text,uuid,timestamptz) to service_role;
grant execute on function public.activate_google_calendar_connection(uuid,text,uuid,text,text,text,text,timestamptz,text[],jsonb,timestamptz) to service_role;
grant execute on function public.finish_google_calendar_oauth_completion(uuid,text,uuid,timestamptz) to service_role;
grant execute on function public.release_google_calendar_oauth_completion(uuid,text,uuid) to service_role;
grant execute on function public.cleanup_google_calendar_oauth_states(uuid,timestamptz) to service_role;
grant execute on function public.rotate_google_calendar_oauth_state(uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.disconnect_google_calendar_connection(uuid,uuid) to service_role;
grant execute on function public.configure_google_calendar_selection(uuid,uuid,uuid,uuid,uuid[],uuid) to service_role;
grant execute on function public.stage_google_calendar_event_operation(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,uuid,timestamptz,text) to service_role;
grant execute on function public.claim_google_calendar_event_operation(uuid,uuid,uuid,uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.commit_google_calendar_sync_run(uuid,uuid,uuid,uuid,uuid,text,timestamptz,uuid[],text,timestamptz) to service_role;
grant execute on function public.store_google_calendar_watch(uuid,uuid,uuid,uuid,uuid,text,text,text,text,timestamptz) to service_role;

comment on table public.calendar_integrations is 'Server-only OAuth grants for calendar providers; token columns contain AES-GCM ciphertext.';
comment on table public.calendar_events is 'Server-side synchronization cache and MBV↔provider identity links. Never exposed directly to browser clients.';
comment on table public.google_calendar_token_revocations is 'Encrypted, server-only queue that prevents OAuth grants being orphaned when Google is temporarily unavailable.';
