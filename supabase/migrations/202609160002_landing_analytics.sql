begin;

-- Extiende en forward-only el RPC aplicado por P2. Conserva sus derivaciones y
-- añade únicamente eventos de landing con vocabularios cerrados por evento.
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
    'landing_primary_cta_clicked','landing_view','landing_nav_click',
    'landing_trial_cta_click','landing_login_click','benefits_view',
    'how_it_works_view','premium_benefits_view','pricing_view',
    'pricing_monthly_selected','pricing_annual_selected',
    'premium_checkout_click','faq_open','paywall_view','trial_start',
    'signup_started','signup_completed',
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
    when next_event_name in (
      'landing_primary_cta_clicked','landing_view','landing_nav_click',
      'landing_trial_cta_click','landing_login_click','benefits_view',
      'how_it_works_view','faq_open','trial_start'
    ) then 'acquisition'
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
    when next_event_name in ('premium_gate_viewed','upgrade_opened','premium_benefits_view','paywall_view') then 'premium'
    when next_event_name in ('pricing_view','pricing_monthly_selected','pricing_annual_selected') then 'pricing'
    when next_event_name in ('checkout_started','premium_checkout_click') then 'checkout'
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
      when next_event_name='landing_view' then array['landing_hero']
      when next_event_name='landing_nav_click' then array['landing_header']
      when next_event_name in ('landing_trial_cta_click','trial_start') then array[
        'landing_header','landing_hero','landing_benefits','landing_how_it_works',
        'landing_included','landing_showcase','landing_premium','landing_pricing',
        'landing_comparison','landing_after_trial','landing_footer','landing_faq'
      ]
      when next_event_name='landing_login_click' then array['landing_header','landing_hero','landing_after_trial','landing_footer']
      when next_event_name='benefits_view' then array['landing_benefits']
      when next_event_name='how_it_works_view' then array['landing_how_it_works']
      when next_event_name='premium_benefits_view' then array['landing_premium']
      when next_event_name in ('pricing_view','pricing_monthly_selected','pricing_annual_selected') then array['landing_pricing']
      when next_event_name='premium_checkout_click' then array['landing_premium','landing_pricing','landing_comparison','landing_after_trial','landing_faq','upgrade_page']
      when next_event_name='faq_open' then array['landing_faq']
      when next_event_name='paywall_view' then array['landing_premium','landing_pricing','landing_comparison','upgrade_page']
      when next_event_name in ('signup_started','signup_completed','sign_up_completed','email_verified','trial_started','login_succeeded','app_session_started') then array['email_form','google','magic_link','authenticated_access','first_verified_access','authenticated_app']
      when next_event_name='onboarding_started' then array['welcome','onboarding']
      when next_event_name in ('onboarding_focus_selected','first_outcome_created') then array['onboarding']
      when next_event_name='first_action_created' then array['onboarding','habit','monthly_planning','weekly_planning','today','goal']
      when next_event_name='first_action_completed' then array['task_toggle']
      when next_event_name='first_habit_recorded' then array['habit_toggle','habit_progress']
      when next_event_name='action_rescheduled' then array['task_edit','priority_assignment','reschedule']
      when next_event_name='premium_gate_viewed' then array['five_year_planning','fitness_and_nutrition','upgrade_page']
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
        when next_event_name in ('landing_view','benefits_view','how_it_works_view','premium_benefits_view','pricing_view','pricing_monthly_selected','pricing_annual_selected','faq_open') then array['/']
        when next_event_name='landing_nav_click' then array['/','/trial','/login','/upgrade']
        when next_event_name in ('landing_trial_cta_click','trial_start') then array['/trial']
        when next_event_name='landing_login_click' then array['/login']
        when next_event_name='premium_checkout_click' then array['/upgrade']
        when next_event_name='paywall_view' then array['/','/upgrade']
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
      when next_event_name='landing_nav_click' then array['como-funciona','que-incluye','beneficios','planes','faq']
      when next_event_name in ('benefits_view','premium_benefits_view') then array['que-incluye','beneficios']
      when next_event_name='how_it_works_view' then array['como-funciona']
      when next_event_name in ('pricing_view','paywall_view') then array['planes']
      when next_event_name='pricing_monthly_selected' then array['monthly']
      when next_event_name='pricing_annual_selected' then array['annual']
      when next_event_name='premium_checkout_click' then array['monthly','annual']
      when next_event_name='faq_open' then array['faq']
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

insert into public.platform_settings(key,value,description,updated_at) values
  ('event_taxonomy_version','"2026-09-16.4"'::jsonb,'Taxonomía v2 con eventos de landing y metadatos cerrados',now())
on conflict(key) do update
set value=excluded.value,description=excluded.description,updated_at=excluded.updated_at;

commit;
