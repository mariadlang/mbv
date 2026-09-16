begin;

-- Extiende la taxonomía cerrada sin permitir texto libre. Signup y activación
-- referidos se derivan en servidor a partir de un referral_id opaco.
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
    'support_request_submitted','app_session_started','sign_up_completed',
    'weekly_recap_viewed','weekly_recap_completed',
    'return_experience_viewed','return_experience_action_clicked',
    'share_card_opened','share_card_generated','share_card_customized',
    'share_exported','share_native_started',
    'share_card_created','share_card_shared','referral_prompt_viewed','referral_link_created',
    'referral_link_copied','referral_share_started',
    'referral_visit_recorded','experiment_exposure_recorded'
  ];
  profile_created_at timestamptz;
  event_time timestamptz;
  safe jsonb := '{}'::jsonb;
  canonical_feature text;
  affected integer;
  second_session_id text;
  second_session_event_at timestamptz;
  activation_time timestamptz;
  referral_id text;
  referred_signup_time timestamptz;
  metadata_key text;
  metadata_text text;
  normalized_route text;
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
    when next_event_name in ('weekly_recap_viewed','weekly_recap_completed') then 'weekly_recap'
    when next_event_name in ('return_experience_viewed','return_experience_action_clicked') then 'return_experience'
    when next_event_name in (
      'share_card_opened','share_card_generated','share_card_customized',
      'share_exported','share_native_started','share_card_created','share_card_shared'
    ) then 'sharing'
    when next_event_name in (
      'referral_prompt_viewed','referral_link_created','referral_link_copied','referral_share_started',
      'referral_visit_recorded'
    ) then 'referrals'
    when next_event_name='experiment_exposure_recorded' then 'experimentation'
  end;

  -- Cada evento tiene vocabulario cerrado. No se aceptan tokens arbitrarios
  -- aunque usen una clave conocida: una sola palabra privada también se omite.
  for metadata_key,metadata_text in
    select item.key,item.value
    from jsonb_each_text(next_metadata) item
    where jsonb_typeof(next_metadata->item.key) in ('string','number','boolean')
  loop
    if metadata_key='source' and metadata_text = any(case
      when next_event_name='landing_primary_cta_clicked' then array['landing_header','landing_hero','landing_footer','trial']
      when next_event_name in ('signup_started','signup_completed','sign_up_completed','email_verified','trial_started','login_succeeded','app_session_started') then array['email_form','google','magic_link','authenticated_access','first_verified_access','authenticated_app']
      when next_event_name='onboarding_started' then array['welcome','onboarding']
      when next_event_name in ('onboarding_focus_selected','first_outcome_created') then array['onboarding']
      when next_event_name='first_action_created' then array['onboarding','habit','monthly_planning','weekly_planning','today','goal']
      when next_event_name='first_action_completed' then array['task_toggle']
      when next_event_name='first_habit_recorded' then array['habit_toggle','habit_progress']
      when next_event_name='action_rescheduled' then array['task_edit','priority_assignment','reschedule']
      when next_event_name='premium_gate_viewed' then array['five_year_planning','feed_hub','upgrade_page']
      when next_event_name in ('upgrade_opened','checkout_started') then array['upgrade_page']
      when next_event_name='task_created' then array['quick_add','task_form']
      when next_event_name='task_completed' then array['task_toggle']
      when next_event_name='weekly_recap_viewed' then array['linked_entry','weekly_plan','weekly_review']
      when next_event_name='weekly_recap_completed' then array['weekly_review']
      when next_event_name in ('return_experience_viewed','return_experience_action_clicked') then array['dashboard']
      when next_event_name='referral_visit_recorded' then array['referral_link']
      else array[]::text[] end) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='route' then
      normalized_route := split_part(split_part(metadata_text,'?',1),'#',1);
      if normalized_route = any(case
        when next_event_name='landing_primary_cta_clicked' then array['/','/signup','/login','/trial','/upgrade','/app/today','/app/dashboard','/app/planning/weekly','/app/progress','/app/journal']
        when next_event_name='signup_started' then array['/signup']
        when next_event_name in ('upgrade_opened','checkout_started') then array['/upgrade']
        when next_event_name='today_view_opened' then array['/app/today']
        when next_event_name='referral_visit_recorded' then array['/signup']
        else array[]::text[] end) then
        safe := safe || jsonb_build_object(metadata_key,normalized_route);
      end if;
    elsif metadata_key='view' and metadata_text = any(case
      when next_event_name in ('onboarding_focus_selected','first_outcome_created') then array['today','goal','week','habit']
      when next_event_name in ('share_card_opened','share_card_generated','share_card_customized','share_exported','share_native_started') then array['story','feed','square','weekly','habits','progress']
      when next_event_name in ('share_card_created','share_card_shared') then array['story','feed','square']
      else array[]::text[] end) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='section' and metadata_text = any(case
      when next_event_name='settings_updated' then array['profile']
      when next_event_name='suggestion_submitted' then array['suggestion']
      when next_event_name='bug_report_submitted' then array['bug']
      when next_event_name='support_request_submitted' then array['support']
      when next_event_name='share_card_customized' then array['template','format','metrics','headline']
      else array[]::text[] end) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='period' and (
      (next_event_name='annual_plan_updated' and metadata_text='annual')
      or (next_event_name='monthly_plan_updated' and metadata_text='monthly')
      or (next_event_name='week_planned' and metadata_text='weekly')
      or (next_event_name='progress_review_created' and metadata_text = any(array['weekly','monthly','quarterly','annual']))
      or (next_event_name in ('weekly_recap_viewed','weekly_recap_completed') and metadata_text ~ '^([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{4}-W[0-9]{2})$')
    ) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='result' and metadata_text = any(case
      when next_event_name='onboarding_completed' then array['completed']
      when next_event_name='first_action_created' then array['connected']
      when next_event_name='weekly_recap_completed' then array['saved','saved_and_prepare']
      when next_event_name='return_experience_action_clicked' then array['pending','priority','minimum','move','release','dismiss']
      else array[]::text[] end) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='version' and metadata_text='2' then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='surface' and metadata_text = any(case
      when next_event_name in ('weekly_recap_viewed','weekly_recap_completed') then array['weekly_plan']
      when next_event_name in ('return_experience_viewed','return_experience_action_clicked') then array['dashboard']
      when next_event_name in ('share_card_opened','share_card_generated','share_card_customized','share_exported','share_native_started','share_card_created','share_card_shared','referral_prompt_viewed','referral_link_created','referral_link_copied','referral_share_started') then array['progress']
      when next_event_name='experiment_exposure_recorded' then array['dashboard','progress','weekly_plan']
      else array[]::text[] end) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='channel' and metadata_text = any(case
      when next_event_name='share_card_generated' then array['story','feed','square']
      when next_event_name in ('share_exported','share_card_shared') then array['download','native_share','web_share','fallback','fallback_download']
      when next_event_name='share_native_started' then array['native_share','web_share']
      when next_event_name='referral_link_copied' then array['clipboard','share_fallback']
      when next_event_name='referral_share_started' then array['native_share','web_share','clipboard']
      else array[]::text[] end) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='experiment_id' and next_event_name='experiment_exposure_recorded'
       and metadata_text = any(array['weekly_recap_v1','return_experience_v1','share_cards_v1','referrals_v1','premium_contextual_prompts_v1']) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='variant' and next_event_name='experiment_exposure_recorded'
       and metadata_text = any(array['control','treatment','a','b','enabled','disabled']) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='flag' and next_event_name='experiment_exposure_recorded'
       and metadata_text = any(array['weekly_recap','return_experience','share_cards','referrals','premium_contextual_prompts']) then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='referral_id'
       and next_event_name in ('referral_link_created','referral_visit_recorded')
       and metadata_text ~ '^ref_[a-f0-9]{32,64}$' then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    elsif metadata_key='days_away'
       and next_event_name in ('return_experience_viewed','return_experience_action_clicked')
       and metadata_text ~ '^[0-9]{1,4}$'
       and metadata_text::integer between 0 and 3650 then
      safe := safe || jsonb_build_object(metadata_key,metadata_text);
    end if;
  end loop;

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

  select e.sanitized_metadata->>'referral_id' into referral_id
  from public.user_events e
  where e.user_id=current_id and e.taxonomy_version=2
    and e.event_name='referral_visit_recorded'
    and e.sanitized_metadata->>'referral_id' ~ '^ref_[a-f0-9]{32,64}$'
  order by e.occurred_at,e.id limit 1;

  if referral_id is not null then
    select min(e.occurred_at) into referred_signup_time
    from public.user_events e
    where e.user_id=current_id and e.taxonomy_version=2
      and e.event_name='signup_completed';
  end if;

  if referred_signup_time is not null then
    insert into public.user_events(
      user_id,event_name,feature,sanitized_metadata,session_id,dedupe_key,
      occurred_at,received_at,taxonomy_version
    ) values (
      current_id,'referral_signup_completed','referrals',
      jsonb_build_object('source','server','version','2','referral_id',referral_id),
      'server','referral_signup_completed:v2',referred_signup_time,now(),2
    ) on conflict(user_id,dedupe_key) do nothing;
  end if;

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

    if referral_id is not null then
      insert into public.user_events(
        user_id,event_name,feature,sanitized_metadata,session_id,dedupe_key,
        occurred_at,received_at,taxonomy_version
      ) values (
        current_id,'referral_activation_completed','referrals',
        jsonb_build_object('source','server','version','2','referral_id',referral_id),
        'server','referral_activation_completed:v2',activation_time,now(),2
      ) on conflict(user_id,dedupe_key) do nothing;
    end if;
  end if;
end;
$$;

revoke all on function public.record_user_event(text,text,text,text,jsonb,timestamptz)
  from public,anon;
grant execute on function public.record_user_event(text,text,text,text,jsonb,timestamptz)
  to authenticated;

-- Tasas agregadas con numeradores y denominadores observables. Si un evento
-- server-side todavía no está instrumentado, la tasa correspondiente es null.
create or replace function public.platform_summary_metrics()
returns jsonb language plpgsql security definer set search_path=public,auth
as $$
declare result jsonb;
begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;

  with observable as (
    select p.user_id,p.created_at,min(e.occurred_at) as first_observed_at
    from public.profiles p
    join public.user_events e on e.user_id=p.user_id and e.taxonomy_version=2
    group by p.user_id,p.created_at
  ), counts as (
    select
      count(*) as cohort_users,
      count(*) filter(where exists (
        select 1 from public.user_events e
        where e.user_id=o.user_id and e.taxonomy_version=2 and e.event_name='onboarding_completed'
      )) as onboarding_users,
      count(*) filter(where exists (
        select 1 from public.user_events e
        where e.user_id=o.user_id and e.taxonomy_version=2 and e.event_name='activation_completed'
      )) as activated_users,
      count(*) filter(where o.first_observed_at<o.created_at+interval '1 day' and o.created_at<=now()-interval '2 days') as eligible_1d,
      count(*) filter(where o.first_observed_at<o.created_at+interval '1 day' and o.created_at<=now()-interval '2 days' and exists (
        select 1 from public.user_events e where e.user_id=o.user_id and e.taxonomy_version=2
          and e.occurred_at>=o.created_at+interval '1 day'
          and e.occurred_at<o.created_at+interval '2 days'
      )) as retained_1d,
      count(*) filter(where o.first_observed_at<o.created_at+interval '1 day' and o.created_at<=now()-interval '8 days') as eligible_7d,
      count(*) filter(where o.first_observed_at<o.created_at+interval '1 day' and o.created_at<=now()-interval '8 days' and exists (
        select 1 from public.user_events e where e.user_id=o.user_id and e.taxonomy_version=2
          and e.occurred_at>=o.created_at+interval '7 days'
          and e.occurred_at<o.created_at+interval '8 days'
      )) as retained_7d,
      count(*) filter(where o.first_observed_at<o.created_at+interval '1 day' and o.created_at<=now()-interval '31 days') as eligible_30d,
      count(*) filter(where o.first_observed_at<o.created_at+interval '1 day' and o.created_at<=now()-interval '31 days' and exists (
        select 1 from public.user_events e where e.user_id=o.user_id and e.taxonomy_version=2
          and e.occurred_at>=o.created_at+interval '30 days'
          and e.occurred_at<o.created_at+interval '31 days'
      )) as retained_30d
    from observable o
  ), activity as (
    select
      count(distinct e.user_id) filter(where e.occurred_at>=date_trunc('day',now())) as active_today,
      count(distinct e.user_id) filter(where e.occurred_at>=now()-interval '7 days') as active_7d,
      count(distinct e.user_id) filter(where e.occurred_at>=now()-interval '30 days') as active_30d
    from public.user_events e where e.taxonomy_version=2
  ), growth as (
    select
      count(distinct e.user_id) filter(where e.occurred_at>=now()-interval '7 days' and e.event_name='weekly_recap_completed') as weekly_review_users,
      count(*) filter(where e.occurred_at>=now()-interval '7 days' and e.event_name='weekly_recap_completed') as weekly_review_events,
      count(distinct e.user_id) filter(where e.occurred_at>=now()-interval '7 days' and e.event_name in ('share_exported','share_native_started')) as share_users,
      count(*) filter(where e.occurred_at>=now()-interval '7 days' and e.event_name in ('share_exported','share_native_started')) as share_events,
      count(distinct e.user_id) filter(where e.event_name='referral_visit_recorded') as referral_visit_users,
      count(distinct e.user_id) filter(where e.event_name='referral_signup_completed') as referral_signup_users,
      count(distinct e.user_id) filter(where e.event_name='referral_activation_completed') as referral_activation_users
    from public.user_events e where e.taxonomy_version=2
  ), funnels as (
    select
      count(distinct e.user_id) filter(where e.event_name='premium_gate_viewed') as paywall_view_users,
      count(distinct e.user_id) filter(where e.event_name='checkout_started') as checkout_users,
      count(distinct e.user_id) filter(where e.event_name='checkout_started' and exists (
        select 1 from public.user_events gate
        where gate.user_id=e.user_id and gate.taxonomy_version=2
          and gate.event_name='premium_gate_viewed' and gate.occurred_at<=e.occurred_at
      )) as paywall_checkout_users,
      count(distinct e.user_id) filter(where e.event_name='trial_started') as trial_users,
      count(distinct e.user_id) filter(where e.event_name='payment_confirmed') as payment_users,
      count(distinct e.user_id) filter(where e.event_name='payment_confirmed' and exists (
        select 1 from public.user_events checkout
        where checkout.user_id=e.user_id and checkout.taxonomy_version=2
          and checkout.event_name='checkout_started' and checkout.occurred_at<=e.occurred_at
      )) as checkout_payment_users,
      count(distinct e.user_id) filter(where e.event_name='payment_confirmed' and exists (
        select 1 from public.user_events trial
        where trial.user_id=e.user_id and trial.taxonomy_version=2
          and trial.event_name='trial_started' and trial.occurred_at<=e.occurred_at
      )) as trial_payment_users,
      count(*) filter(where e.event_name='payment_confirmed') as payment_events,
      count(distinct e.user_id) filter(where e.event_name='subscription_renewal_due') as renewal_eligible_users,
      count(distinct e.user_id) filter(where e.event_name='subscription_renewed' and exists (
        select 1 from public.user_events renewal_due
        where renewal_due.user_id=e.user_id and renewal_due.taxonomy_version=2
          and renewal_due.event_name='subscription_renewal_due'
          and renewal_due.occurred_at<=e.occurred_at
      )) as renewal_users
    from public.user_events e where e.taxonomy_version=2
  )
  select jsonb_build_object(
    'total_users',(select count(*) from auth.users),
    'new_users_week',(select count(*) from auth.users where created_at>=date_trunc('week',now())),
    'new_users_month',(select count(*) from auth.users where created_at>=date_trunc('month',now())),
    'active_today',a.active_today,
    'active_7d',a.active_7d,
    'weekly_active_users',a.active_7d,
    'active_30d',a.active_30d,
    'analytics_v2_cohort_users',c.cohort_users,
    'onboarding_rate',case when c.cohort_users=0 then null else round(100.0*c.onboarding_users/c.cohort_users,1) end,
    'activation_rate',case when c.cohort_users=0 then null else round(100.0*c.activated_users/c.cohort_users,1) end,
    'retention_1d_eligible_users',c.eligible_1d,
    'retention_1d_users',c.retained_1d,
    'retention_1d',case when c.eligible_1d=0 then null else round(100.0*c.retained_1d/c.eligible_1d,1) end,
    'retention_7d_eligible_users',c.eligible_7d,
    'retention_7d_users',c.retained_7d,
    'retention_7d',case when c.eligible_7d=0 then null else round(100.0*c.retained_7d/c.eligible_7d,1) end,
    'retention_30d_eligible_users',c.eligible_30d,
    'retention_30d_users',c.retained_30d,
    'retention_30d',case when c.eligible_30d=0 then null else round(100.0*c.retained_30d/c.eligible_30d,1) end,
    'weekly_review_eligible_users',a.active_7d,
    'weekly_review_users',g.weekly_review_users,
    'weekly_review_events',g.weekly_review_events,
    'weekly_review_rate',case when a.active_7d=0 then null else round(100.0*g.weekly_review_users/a.active_7d,1) end,
    'share_eligible_users',a.active_7d,
    'share_users',g.share_users,
    'share_events',g.share_events,
    'share_rate',case when a.active_7d=0 then null else round(100.0*g.share_users/a.active_7d,1) end,
    'paywall_view_users',f.paywall_view_users,
    'checkout_users',f.checkout_users,
    'payment_users',f.payment_users,
    'paywall_to_checkout_rate',case when f.paywall_view_users=0 then null else round(100.0*f.paywall_checkout_users/f.paywall_view_users,1) end,
    'checkout_to_payment_rate',case when f.payment_events=0 or f.checkout_users=0 then null else round(100.0*f.checkout_payment_users/f.checkout_users,1) end,
    'trial_users',f.trial_users,
    'trial_conversion_rate',case when f.payment_events=0 or f.trial_users=0 then null else round(100.0*f.trial_payment_users/f.trial_users,1) end,
    'renewal_eligible_users',f.renewal_eligible_users,
    'renewal_users',f.renewal_users,
    'renewal_rate',case when f.renewal_eligible_users=0 then null else round(100.0*f.renewal_users/f.renewal_eligible_users,1) end,
    'referral_visit_users',g.referral_visit_users,
    'referral_signup_users',g.referral_signup_users,
    'referral_activation_users',g.referral_activation_users,
    'referral_signup_rate',case when g.referral_visit_users=0 then null else round(100.0*g.referral_signup_users/g.referral_visit_users,1) end,
    'referral_activation_rate',case when g.referral_visit_users=0 then null else round(100.0*g.referral_activation_users/g.referral_visit_users,1) end,
    'pending_suggestions',(select count(*) from public.feedback_tickets where type='suggestion' and status in('new','evaluating','planned')),
    'open_support',(select count(*) from public.feedback_tickets where type in('bug','support') and status not in('resolved','closed'))
  ) into result from counts c cross join activity a cross join growth g cross join funnels f;
  return result;
end $$;
revoke all on function public.platform_summary_metrics() from public;
grant execute on function public.platform_summary_metrics() to authenticated;

drop function if exists public.platform_feature_usage();
create function public.platform_feature_usage()
returns table(
  feature text,
  unique_users bigint,
  event_count bigint,
  last_used timestamptz,
  users_7d bigint,
  users_30d bigint,
  observable_users bigint,
  adoption_rate numeric
)
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  return query
  with observable as (
    select count(distinct e.user_id)::bigint as total
    from public.user_events e where e.taxonomy_version=2
  ), usage as (
    select
      e.feature,
      count(distinct e.user_id)::bigint as unique_users,
      count(*)::bigint as event_count,
      max(e.occurred_at) as last_used,
      count(distinct e.user_id) filter(where e.occurred_at>=now()-interval '7 days')::bigint as users_7d,
      count(distinct e.user_id) filter(where e.occurred_at>=now()-interval '30 days')::bigint as users_30d
    from public.user_events e
    where e.taxonomy_version=2
    group by e.feature
  )
  select
    u.feature,u.unique_users,u.event_count,u.last_used,u.users_7d,u.users_30d,
    o.total,coalesce(round(100.0*u.unique_users/nullif(o.total,0),1),0)
  from usage u cross join observable o
  order by u.event_count desc;
end $$;
revoke all on function public.platform_feature_usage() from public;
grant execute on function public.platform_feature_usage() to authenticated;

insert into public.platform_settings(key,value,description,updated_at) values
  ('event_taxonomy_version','"2026-09-16.3"'::jsonb,'Taxonomía minimizada por evento y métricas growth con denominadores explícitos',now())
on conflict(key) do update set value=excluded.value,description=excluded.description,updated_at=excluded.updated_at;

commit;
