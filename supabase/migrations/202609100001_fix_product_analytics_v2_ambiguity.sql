begin;

-- Evita el conflicto PL/pgSQL entre la variable de la segunda sesión y la
-- columna homónima del CTE de hitos. La versión anterior abortaba cualquier
-- evento válido con SQLSTATE 42702 antes de finalizar el RPC.
create or replace function public.record_user_event(
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
  second_session_event_at timestamptz;
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
      into second_session_id,second_session_event_at
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

    if second_session_event_at is not null then
      insert into public.user_events(
        user_id,event_name,feature,sanitized_metadata,session_id,dedupe_key,
        occurred_at,received_at,taxonomy_version
      ) values (
        current_id,'second_session_started','account',
        '{"source":"server","version":"2"}'::jsonb,
        second_session_id,'second_session_started:v2',second_session_event_at,now(),2
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
  select greatest(
      milestone_values.onboarding_at,
      milestone_values.connected_action_at,
      milestone_values.progress_at,
      milestone_values.second_session_at
    )
    into activation_time
  from milestones as milestone_values
  where milestone_values.onboarding_at is not null
    and milestone_values.connected_action_at is not null
    and milestone_values.progress_at is not null
    and milestone_values.second_session_at is not null;

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

commit;
