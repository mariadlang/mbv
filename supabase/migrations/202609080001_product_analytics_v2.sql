begin;

alter table public.user_events
  add column if not exists taxonomy_version smallint not null default 1,
  add column if not exists received_at timestamptz;

update public.user_events
set received_at=occurred_at
where received_at is null;

alter table public.user_events
  alter column received_at set default now(),
  alter column received_at set not null;

alter table public.profiles
  add column if not exists activated_v2_at timestamptz;

create index if not exists user_events_user_taxonomy_time_idx
  on public.user_events(user_id, taxonomy_version, occurred_at);

create index if not exists user_events_user_received_at_idx
  on public.user_events(user_id, received_at desc);

-- Toda escritura de telemetría debe pasar por el RPC validado. La policy
-- histórica permitía insertar directamente y eludir taxonomía, rate limit y
-- derivación de hitos server-only.
drop policy if exists "events_self_insert" on public.user_events;
revoke insert on table public.user_events from anon, authenticated;

-- Reemplaza la firma aplicada sin modificar la migración histórica.
drop function if exists public.record_user_event(text,text,text,text,jsonb);

create function public.record_user_event(
  next_event_name text,
  next_feature text,
  next_session_id text,
  next_dedupe_key text,
  next_metadata jsonb default '{}'::jsonb,
  next_occurred_at timestamptz default null
) returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  current_id uuid := auth.uid();
  allowed_client constant text[] := array[
    'landing_primary_cta_clicked','signup_started','signup_completed',
    'email_verified','trial_started','onboarding_started',
    'onboarding_focus_selected','first_outcome_created',
    'first_action_created','first_action_completed','first_habit_recorded',
    'action_rescheduled','premium_gate_viewed','upgrade_opened',
    'checkout_started','login_succeeded','onboarding_completed',
    'goal_created','annual_plan_updated','monthly_plan_updated','week_planned',
    'task_created','task_completed','today_view_opened','journal_entry_created',
    'progress_review_created','routine_created','workout_completed','meal_logged',
    'settings_updated','suggestion_submitted','bug_report_submitted',
    'support_request_submitted','app_session_started','sign_up_completed'
  ];
  profile_created_at timestamptz;
  event_time timestamptz;
  safe jsonb;
  canonical_feature text;
  affected integer;
  second_session_id text;
  second_session_at timestamptz;
  activation_time timestamptz;
begin
  if current_id is null then raise exception 'authentication required'; end if;
  if not (next_event_name = any(allowed_client)) then raise exception 'unsupported event'; end if;
  if next_session_id !~ '^[A-Za-z0-9:_-]{6,100}$' then raise exception 'invalid session id'; end if;
  if next_dedupe_key !~ '^[A-Za-z0-9:._-]{6,180}$'
     or next_dedupe_key not like next_event_name || ':%' then
    raise exception 'invalid dedupe key';
  end if;
  if next_metadata is null then next_metadata := '{}'::jsonb; end if;
  if jsonb_typeof(next_metadata) <> 'object' then raise exception 'invalid metadata'; end if;

  -- Serializa flushes concurrentes por usuaria para no duplicar hitos derivados.
  select p.created_at into profile_created_at
  from public.profiles p where p.user_id=current_id for update;
  if profile_created_at is null then raise exception 'profile required'; end if;

  event_time := coalesce(next_occurred_at, now());
  if event_time < now()-interval '30 days' or event_time > now()+interval '5 minutes' then
    raise exception 'invalid occurred_at';
  end if;
  if (select count(*) from public.user_events e
      where e.user_id=current_id and e.received_at>=now()-interval '1 hour') >= 240 then
    raise exception 'event rate limit exceeded';
  end if;

  canonical_feature := case
    when next_event_name='landing_primary_cta_clicked' then 'acquisition'
    when next_event_name in ('signup_started','signup_completed','email_verified',
      'trial_started','login_succeeded','app_session_started','sign_up_completed') then 'account'
    when next_event_name in ('onboarding_started','onboarding_focus_selected',
      'first_outcome_created','onboarding_completed') then 'onboarding'
    when next_event_name in ('first_action_created','first_action_completed','action_rescheduled') then 'actions'
    when next_event_name='first_habit_recorded' then 'habits'
    when next_event_name='goal_created' then 'goals'
    when next_event_name='annual_plan_updated' then 'annual_planning'
    when next_event_name='monthly_plan_updated' then 'monthly_planning'
    when next_event_name='week_planned' then 'weekly_planning'
    when next_event_name in ('task_created','task_completed') then 'tasks'
    when next_event_name='today_view_opened' then 'today'
    when next_event_name='journal_entry_created' then 'journal'
    when next_event_name='progress_review_created' then 'progress'
    when next_event_name='routine_created' then 'routines'
    when next_event_name='workout_completed' then 'fitness'
    when next_event_name='meal_logged' then 'nutrition'
    when next_event_name='settings_updated' then 'settings'
    when next_event_name in ('suggestion_submitted','bug_report_submitted','support_request_submitted') then 'support'
    when next_event_name in ('premium_gate_viewed','upgrade_opened') then 'premium'
    when next_event_name='checkout_started' then 'checkout'
  end;

  select coalesce(jsonb_object_agg(m.key,to_jsonb(
    case
      when position('@' in m.value)>0 then 'redacted'
      when m.key='route' then left(split_part(split_part(m.value,'?',1),'#',1),200)
      else left(m.value,200)
    end
  )),'{}'::jsonb)
  into safe
  from jsonb_each_text(next_metadata) m
  where m.key=any(array['source','route','view','section','period','result','version'])
    and jsonb_typeof(next_metadata->m.key) in ('string','number','boolean');

  insert into public.user_events(
    user_id,event_name,feature,sanitized_metadata,session_id,dedupe_key,
    occurred_at,received_at,taxonomy_version
  ) values (
    current_id,next_event_name,canonical_feature,safe,next_session_id,
    next_dedupe_key,event_time,now(),2
  ) on conflict(user_id,dedupe_key) do nothing;
  get diagnostics affected=row_count;
  if affected=0 then return; end if;

  update public.profiles p set
    last_active_at=greatest(coalesce(p.last_active_at,event_time),event_time),
    session_count=p.session_count+case when next_event_name='app_session_started' then 1 else 0 end,
    onboarding_completed_at=case
      when next_event_name='onboarding_completed'
      then least(coalesce(p.onboarding_completed_at,event_time),event_time)
      else p.onboarding_completed_at end
  where p.user_id=current_id;

  if next_event_name='app_session_started' then
    select sessions.session_id,sessions.first_at
      into second_session_id,second_session_at
    from (
      select e.session_id,min(e.occurred_at) as first_at
      from public.user_events e
      where e.user_id=current_id and e.taxonomy_version=2
        and e.event_name='app_session_started'
        and e.occurred_at between profile_created_at and profile_created_at+interval '7 days'
      group by e.session_id
    ) sessions
    order by sessions.first_at,sessions.session_id
    offset 1 limit 1;

    if second_session_at is not null then
      insert into public.user_events(
        user_id,event_name,feature,sanitized_metadata,session_id,dedupe_key,
        occurred_at,received_at,taxonomy_version
      ) values (
        current_id,'second_session_started','account',
        '{"source":"server","version":"2"}'::jsonb,
        second_session_id,'second_session_started:v2',second_session_at,now(),2
      ) on conflict(user_id,dedupe_key) do nothing;
    end if;
  end if;

  with milestones as (
    select
      min(e.occurred_at) filter(where e.event_name='onboarding_completed') as onboarding_at,
      min(e.occurred_at) filter(where e.event_name='first_action_created' and (
        e.sanitized_metadata->>'result'='connected'
        or e.sanitized_metadata->>'source' in ('onboarding','habit','monthly_planning','weekly_planning','today','goal')
      )) as connected_action_at,
      min(e.occurred_at) filter(where e.event_name in (
        'first_action_completed','first_habit_recorded','action_rescheduled'
      )) as progress_at,
      min(e.occurred_at) filter(where e.event_name='second_session_started') as second_session_at
    from public.user_events e
    where e.user_id=current_id and e.taxonomy_version=2
      and e.occurred_at between profile_created_at and profile_created_at+interval '7 days'
  )
  select greatest(onboarding_at,connected_action_at,progress_at,second_session_at)
    into activation_time
  from milestones
  where onboarding_at is not null and connected_action_at is not null
    and progress_at is not null and second_session_at is not null;

  if activation_time is not null then
    insert into public.user_events(
      user_id,event_name,feature,sanitized_metadata,session_id,dedupe_key,
      occurred_at,received_at,taxonomy_version
    ) values (
      current_id,'activation_completed','activation',
      '{"source":"server","result":"completed","version":"2"}'::jsonb,
      'server','activation_completed:v2',activation_time,now(),2
    ) on conflict(user_id,dedupe_key) do nothing;

    update public.profiles p set
      activated_v2_at=coalesce(p.activated_v2_at,activation_time),
      activated_at=coalesce(p.activated_at,activation_time)
    where p.user_id=current_id;
  end if;
end;
$$;

revoke all on function public.record_user_event(text,text,text,text,jsonb,timestamptz)
  from public,anon;
grant execute on function public.record_user_event(text,text,text,text,jsonb,timestamptz)
  to authenticated;

-- Las métricas visibles se actualizan de forma explícita para no mezclar la
-- definición histórica de activated_at con la definición v2.
create or replace function public.platform_summary_metrics()
returns jsonb language plpgsql security definer set search_path=public,auth
as $$
declare
  result jsonb;
  analytics_v2_cohort_users bigint;
  analytics_v2_onboarding_users bigint;
  analytics_v2_activated_users bigint;
begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;

  -- La analitica es opcional: la base observable son unicamente las cuentas
  -- que tienen al menos un evento v2. La presencia de eventos no se presenta
  -- como un registro persistido de consentimiento.
  select
    count(*),
    count(*) filter(where p.onboarding_completed_at is not null),
    count(*) filter(where p.activated_v2_at is not null)
  into
    analytics_v2_cohort_users,
    analytics_v2_onboarding_users,
    analytics_v2_activated_users
  from public.profiles p
  where exists (
    select 1
    from public.user_events e
    where e.user_id=p.user_id and e.taxonomy_version=2
  );

  select jsonb_build_object(
    'total_users',(select count(*) from auth.users),
    'new_users_week',(select count(*) from auth.users where created_at>=date_trunc('week',now())),
    'new_users_month',(select count(*) from auth.users where created_at>=date_trunc('month',now())),
    'active_today',(select count(*) from public.profiles where last_active_at>=date_trunc('day',now())),
    'active_7d',(select count(*) from public.profiles where last_active_at>=now()-interval '7 days'),
    'active_30d',(select count(*) from public.profiles where last_active_at>=now()-interval '30 days'),
    'analytics_v2_cohort_users',analytics_v2_cohort_users,
    'onboarding_rate',coalesce(round(100.0*analytics_v2_onboarding_users/nullif(analytics_v2_cohort_users,0),1),0),
    'activation_rate',coalesce(round(100.0*analytics_v2_activated_users/nullif(analytics_v2_cohort_users,0),1),0),
    'retention_7d',coalesce((select round(100.0*count(*) filter(where last_active_at>=created_at+interval '7 days')/nullif(count(*),0),1) from public.profiles where created_at<=now()-interval '7 days'),0),
    'retention_30d',coalesce((select round(100.0*count(*) filter(where last_active_at>=created_at+interval '30 days')/nullif(count(*),0),1) from public.profiles where created_at<=now()-interval '30 days'),0),
    'pending_suggestions',(select count(*) from public.feedback_tickets where type='suggestion' and status in('new','evaluating','planned')),
    'open_support',(select count(*) from public.feedback_tickets where type in('bug','support') and status not in('resolved','closed'))
  ) into result; return result;
end $$;
revoke all on function public.platform_summary_metrics() from public;
grant execute on function public.platform_summary_metrics() to authenticated;

create or replace function public.platform_list_users()
returns table(user_id uuid,email text,display_name text,created_at timestamptz,last_active_at timestamptz,locale text,timezone text,onboarding_completed boolean,activated boolean,session_count integer,goals_created bigint,tasks_completed bigint,top_feature text,marketing_consent boolean,account_status text)
language plpgsql security definer set search_path=public,auth as $$ begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  return query select p.user_id,p.email,p.display_name,p.created_at,p.last_active_at,p.locale,p.timezone,p.onboarding_completed_at is not null,p.activated_v2_at is not null,p.session_count,(select count(*) from public.user_events e where e.user_id=p.user_id and e.event_name='goal_created'),(select count(*) from public.user_events e where e.user_id=p.user_id and e.event_name='task_completed'),coalesce((select e.feature from public.user_events e where e.user_id=p.user_id group by e.feature order by count(*) desc limit 1),'—'),coalesce(m.email_marketing_consent,false),p.account_status from public.profiles p left join public.marketing_preferences m on m.user_id=p.user_id order by p.created_at desc;
end $$;
revoke all on function public.platform_list_users() from public;
grant execute on function public.platform_list_users() to authenticated;

insert into public.platform_settings(key,value,description,updated_at) values
('activation_definition','{"version":2,"window_days":7,"requires_onboarding":true,"requires_connected_action":true,"accepted_progress_events":["first_action_completed","first_habit_recorded","action_rescheduled"],"requires_second_session":true,"requires_goal":false}'::jsonb,'Definición de activación v2; la autorización de producto no depende de este KPI',now()),
('event_taxonomy_version','"2026-09-08.2"'::jsonb,'Taxonomía minimizada de eventos de producto',now())
on conflict(key) do update set value=excluded.value,description=excluded.description,updated_at=excluded.updated_at;

commit;
