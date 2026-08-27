-- My Best Version: soporte, analítica minimizada y plataforma administrativa.
-- No almacena contenido del journal, metas, comidas, salud ni notas privadas.

alter table public.profiles add column if not exists locale text not null default 'es' check (locale in ('es','en'));
alter table public.profiles add column if not exists timezone text not null default 'America/Bogota';
alter table public.profiles add column if not exists last_active_at timestamptz;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add column if not exists activated_at timestamptz;
alter table public.profiles add column if not exists session_count integer not null default 0;
alter table public.profiles add column if not exists account_status text not null default 'active' check (account_status in ('active','suspended','deletion_requested','deleted'));

create table if not exists public.feedback_tickets (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('suggestion','bug','support')),
  category text not null,
  subject text not null,
  message text not null,
  attachment_path text,
  page_url text,
  device_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','in_review','waiting_response','resolved','closed','evaluating','planned','implemented','not_planned')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  related_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.feedback_admin_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.feedback_tickets(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id),
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  feature text not null,
  sanitized_metadata jsonb not null default '{}'::jsonb,
  session_id text not null,
  dedupe_key text not null,
  occurred_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create table if not exists public.marketing_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_marketing_consent boolean not null default false,
  consent_source text,
  consent_given_at timestamptz,
  consent_withdrawn_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  sanitized_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.support_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  ticket_type text not null check (ticket_type in ('suggestion','bug','support')),
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.support_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  locale text not null default 'es' check (locale in ('es','en')),
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_tickets_user_created_idx on public.feedback_tickets(user_id, created_at desc);
create index if not exists feedback_tickets_queue_idx on public.feedback_tickets(type, status, priority, created_at desc);
create index if not exists feedback_notes_ticket_idx on public.feedback_admin_notes(ticket_id, created_at desc);
create index if not exists user_events_time_idx on public.user_events(occurred_at desc);
create index if not exists user_events_feature_idx on public.user_events(feature, event_name, occurred_at desc);

alter table public.feedback_tickets enable row level security;
alter table public.feedback_admin_notes enable row level security;
alter table public.user_events enable row level security;
alter table public.marketing_preferences enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.support_categories enable row level security;
alter table public.support_faqs enable row level security;
alter table public.platform_settings enable row level security;

drop policy if exists "feedback_self_or_admin_read" on public.feedback_tickets;
create policy "feedback_self_or_admin_read" on public.feedback_tickets for select to authenticated using (user_id = auth.uid() or public.is_superadmin());
drop policy if exists "feedback_self_insert" on public.feedback_tickets;
create policy "feedback_self_insert" on public.feedback_tickets for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "feedback_admin_update" on public.feedback_tickets;
create policy "feedback_admin_update" on public.feedback_tickets for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
drop policy if exists "feedback_notes_admin_only" on public.feedback_admin_notes;
create policy "feedback_notes_admin_only" on public.feedback_admin_notes for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
drop policy if exists "events_self_insert" on public.user_events;
create policy "events_self_insert" on public.user_events for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "events_admin_read" on public.user_events;
create policy "events_admin_read" on public.user_events for select to authenticated using (public.is_superadmin());
drop policy if exists "marketing_self_or_admin_read" on public.marketing_preferences;
create policy "marketing_self_or_admin_read" on public.marketing_preferences for select to authenticated using (user_id = auth.uid() or public.is_superadmin());
drop policy if exists "marketing_self_write" on public.marketing_preferences;
create policy "marketing_self_write" on public.marketing_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admin_audit_admin_read" on public.admin_audit_log;
create policy "admin_audit_admin_read" on public.admin_audit_log for select to authenticated using (public.is_superadmin());
drop policy if exists "support_categories_read" on public.support_categories;
create policy "support_categories_read" on public.support_categories for select to authenticated using (active or public.is_superadmin());
drop policy if exists "support_categories_admin_write" on public.support_categories;
create policy "support_categories_admin_write" on public.support_categories for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
drop policy if exists "support_faqs_read" on public.support_faqs;
create policy "support_faqs_read" on public.support_faqs for select to authenticated using (active or public.is_superadmin());
drop policy if exists "support_faqs_admin_write" on public.support_faqs;
create policy "support_faqs_admin_write" on public.support_faqs for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
drop policy if exists "platform_settings_admin_only" on public.platform_settings;
create policy "platform_settings_admin_only" on public.platform_settings for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-attachments','feedback-attachments',false,2097152,array['application/pdf','image/jpeg','image/png','text/plain'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "feedback_attachments_insert_self" on storage.objects;
create policy "feedback_attachments_insert_self" on storage.objects for insert to authenticated with check (bucket_id='feedback-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "feedback_attachments_read_self_or_admin" on storage.objects;
create policy "feedback_attachments_read_self_or_admin" on storage.objects for select to authenticated using (bucket_id='feedback-attachments' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_superadmin()));

create or replace function public.create_feedback_ticket(next_type text,next_category text,next_subject text,next_message text,next_attachment_path text,next_page_url text,next_device_metadata jsonb)
returns setof public.feedback_tickets language plpgsql security definer set search_path=public
as $$
declare current_id uuid:=auth.uid(); created_ticket public.feedback_tickets;
begin
  if current_id is null then raise exception 'authentication required'; end if;
  if next_type not in ('suggestion','bug','support') then raise exception 'unsupported type'; end if;
  if length(trim(next_subject))<3 or length(trim(next_message))<10 then raise exception 'incomplete ticket'; end if;
  if (select count(*) from public.feedback_tickets where user_id=current_id and created_at>now()-interval '10 minutes')>=5 then raise exception 'rate limit exceeded'; end if;
  insert into public.feedback_tickets(reference,user_id,type,category,subject,message,attachment_path,page_url,device_metadata,status)
  values('MBV-'||to_char(now() at time zone 'America/Bogota','YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),current_id,next_type,left(trim(next_category),80),left(trim(next_subject),160),left(trim(next_message),5000),next_attachment_path,left(next_page_url,500),jsonb_build_object('browser',left(coalesce(next_device_metadata->>'browser',''),120),'os',left(coalesce(next_device_metadata->>'os',''),120),'app_version',left(coalesce(next_device_metadata->>'app_version',''),40),'occurred_at',coalesce(next_device_metadata->>'occurred_at',now()::text)),case when next_type='suggestion' then 'new' else 'new' end)
  returning * into created_ticket;
  return next created_ticket;
end; $$;
revoke all on function public.create_feedback_ticket(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_feedback_ticket(text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.record_user_event(next_event_name text,next_feature text,next_session_id text,next_dedupe_key text,next_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public
as $$
declare current_id uuid:=auth.uid(); allowed text[]:=array['sign_up_completed','onboarding_started','onboarding_completed','goal_created','annual_plan_updated','monthly_plan_updated','week_planned','task_created','task_completed','today_view_opened','journal_entry_created','progress_review_created','routine_created','workout_completed','meal_logged','settings_updated','suggestion_submitted','bug_report_submitted','support_request_submitted','app_session_started']; safe jsonb; affected integer;
begin
  if current_id is null then raise exception 'authentication required'; end if;
  if not next_event_name=any(allowed) then raise exception 'unsupported event'; end if;
  safe:=jsonb_build_object('source',left(coalesce(next_metadata->>'source','app'),40),'route',left(coalesce(next_metadata->>'route',''),200),'view',left(coalesce(next_metadata->>'view',''),60),'section',left(coalesce(next_metadata->>'section',''),60),'period',left(coalesce(next_metadata->>'period',''),30),'result',left(coalesce(next_metadata->>'result',''),40),'version',left(coalesce(next_metadata->>'version',''),40));
  insert into public.user_events(user_id,event_name,feature,sanitized_metadata,session_id,dedupe_key)
  values(current_id,next_event_name,left(next_feature,60),safe,left(next_session_id,100),left(next_dedupe_key,180)) on conflict(user_id,dedupe_key) do nothing;
  get diagnostics affected = row_count;
  if affected=0 then return; end if;
  update public.profiles p set last_active_at=now(),session_count=session_count+case when next_event_name='app_session_started' then 1 else 0 end,onboarding_completed_at=case when next_event_name='onboarding_completed' and onboarding_completed_at is null then now() else onboarding_completed_at end,activated_at=case when activated_at is null and now()<=p.created_at+interval '7 days' and exists(select 1 from public.user_events e where e.user_id=current_id and e.event_name='onboarding_completed' and e.occurred_at<=p.created_at+interval '7 days') and exists(select 1 from public.user_events e where e.user_id=current_id and e.event_name='goal_created' and e.occurred_at<=p.created_at+interval '7 days') and exists(select 1 from public.user_events e where e.user_id=current_id and e.event_name='task_completed' and e.occurred_at<=p.created_at+interval '7 days') then now() else activated_at end where p.user_id=current_id;
end; $$;
revoke all on function public.record_user_event(text,text,text,text,jsonb) from public;
grant execute on function public.record_user_event(text,text,text,text,jsonb) to authenticated;

create or replace function public.set_marketing_preference(next_consent boolean,next_source text)
returns public.marketing_preferences language plpgsql security definer set search_path=public
as $$ declare result public.marketing_preferences; begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.marketing_preferences(user_id,email_marketing_consent,consent_source,consent_given_at,consent_withdrawn_at)
  values(auth.uid(),next_consent,left(next_source,60),case when next_consent then now() end,case when not next_consent then now() end)
  on conflict(user_id) do update set email_marketing_consent=excluded.email_marketing_consent,consent_source=excluded.consent_source,consent_given_at=case when excluded.email_marketing_consent then now() else public.marketing_preferences.consent_given_at end,consent_withdrawn_at=case when not excluded.email_marketing_consent then now() else null end,updated_at=now() returning * into result;
  return result;
end $$;
revoke all on function public.set_marketing_preference(boolean,text) from public;
grant execute on function public.set_marketing_preference(boolean,text) to authenticated;

create or replace function public.platform_summary_metrics()
returns jsonb language plpgsql security definer set search_path=public,auth
as $$ declare result jsonb; begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  select jsonb_build_object(
    'total_users',(select count(*) from auth.users),
    'new_users_week',(select count(*) from auth.users where created_at>=date_trunc('week',now())),
    'new_users_month',(select count(*) from auth.users where created_at>=date_trunc('month',now())),
    'active_today',(select count(*) from public.profiles where last_active_at>=date_trunc('day',now())),
    'active_7d',(select count(*) from public.profiles where last_active_at>=now()-interval '7 days'),
    'active_30d',(select count(*) from public.profiles where last_active_at>=now()-interval '30 days'),
    'onboarding_rate',coalesce((select round(100.0*count(*) filter(where onboarding_completed_at is not null)/nullif(count(*),0),1) from public.profiles),0),
    'activation_rate',coalesce((select round(100.0*count(*) filter(where activated_at is not null)/nullif(count(*),0),1) from public.profiles),0),
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
  return query select p.user_id,p.email,p.display_name,p.created_at,p.last_active_at,p.locale,p.timezone,p.onboarding_completed_at is not null,p.activated_at is not null,p.session_count,(select count(*) from public.user_events e where e.user_id=p.user_id and e.event_name='goal_created'),(select count(*) from public.user_events e where e.user_id=p.user_id and e.event_name='task_completed'),coalesce((select e.feature from public.user_events e where e.user_id=p.user_id group by e.feature order by count(*) desc limit 1),'—'),coalesce(m.email_marketing_consent,false),p.account_status from public.profiles p left join public.marketing_preferences m on m.user_id=p.user_id order by p.created_at desc;
end $$;
revoke all on function public.platform_list_users() from public;
grant execute on function public.platform_list_users() to authenticated;

create or replace function public.platform_feature_usage()
returns table(feature text,unique_users bigint,event_count bigint,last_used timestamptz,users_7d bigint,users_30d bigint)
language plpgsql security definer set search_path=public as $$ begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  return query select e.feature,count(distinct e.user_id),count(*),max(e.occurred_at),count(distinct e.user_id) filter(where e.occurred_at>=now()-interval '7 days'),count(distinct e.user_id) filter(where e.occurred_at>=now()-interval '30 days') from public.user_events e group by e.feature order by count(*) desc;
end $$;
revoke all on function public.platform_feature_usage() from public;
grant execute on function public.platform_feature_usage() to authenticated;

create or replace function public.platform_update_ticket(target_ticket uuid,next_status text,next_priority text)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  update public.feedback_tickets set status=next_status,priority=next_priority,updated_at=now(),resolved_at=case when next_status in('resolved','closed','implemented','not_planned') then now() else null end where id=target_ticket;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_id,sanitized_metadata) values(auth.uid(),'ticket_updated','feedback_ticket',target_ticket::text,jsonb_build_object('status',next_status,'priority',next_priority));
end $$;
revoke all on function public.platform_update_ticket(uuid,text,text) from public;
grant execute on function public.platform_update_ticket(uuid,text,text) to authenticated;

create or replace function public.platform_add_ticket_note(target_ticket uuid,next_note text)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  if length(trim(next_note))<2 then raise exception 'note required'; end if;
  insert into public.feedback_admin_notes(ticket_id,admin_user_id,note) values(target_ticket,auth.uid(),left(trim(next_note),3000));
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_id) values(auth.uid(),'internal_note_added','feedback_ticket',target_ticket::text);
end $$;
revoke all on function public.platform_add_ticket_note(uuid,text) from public;
grant execute on function public.platform_add_ticket_note(uuid,text) to authenticated;

create or replace function public.platform_upsert_faq(target_faq uuid,next_question text,next_answer text,next_locale text,next_sort_order integer)
returns uuid language plpgsql security definer set search_path=public as $$ declare saved_id uuid; begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  if length(trim(next_question))<4 or length(trim(next_answer))<4 or next_locale not in ('es','en') then raise exception 'invalid faq'; end if;
  if target_faq is null then
    insert into public.support_faqs(question,answer,locale,sort_order) values(left(trim(next_question),300),left(trim(next_answer),3000),next_locale,next_sort_order) returning id into saved_id;
  else
    update public.support_faqs set question=left(trim(next_question),300),answer=left(trim(next_answer),3000),locale=next_locale,sort_order=next_sort_order,updated_at=now() where id=target_faq returning id into saved_id;
  end if;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_id) values(auth.uid(),'faq_upserted','support_faq',saved_id::text);
  return saved_id;
end $$;
revoke all on function public.platform_upsert_faq(uuid,text,text,text,integer) from public;
grant execute on function public.platform_upsert_faq(uuid,text,text,text,integer) to authenticated;

create or replace function public.platform_update_setting(target_key text,next_value jsonb)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  if target_key not in ('activation_definition','event_taxonomy_version') then raise exception 'setting not allowed'; end if;
  insert into public.platform_settings(key,value,updated_by,updated_at) values(target_key,next_value,auth.uid(),now()) on conflict(key) do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_id) values(auth.uid(),'setting_updated','platform_setting',target_key);
end $$;
revoke all on function public.platform_update_setting(text,jsonb) from public;
grant execute on function public.platform_update_setting(text,jsonb) to authenticated;

create or replace function public.platform_update_category(target_category uuid,next_label text,next_active boolean,next_sort_order integer)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.is_superadmin() then raise exception 'superadmin required'; end if;
  if length(trim(next_label))<2 then raise exception 'invalid category'; end if;
  update public.support_categories set label=left(trim(next_label),80),active=next_active,sort_order=next_sort_order,updated_at=now() where id=target_category;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_id,sanitized_metadata) values(auth.uid(),'category_updated','support_category',target_category::text,jsonb_build_object('active',next_active,'sort_order',next_sort_order));
end $$;
revoke all on function public.platform_update_category(uuid,text,boolean,integer) from public;
grant execute on function public.platform_update_category(uuid,text,boolean,integer) to authenticated;

-- El rol nunca se asigna por comparación de correo en la aplicación.
-- Esta función queda revocada para anon/authenticated y sólo puede ejecutarla
-- un operador con privilegios de base de datos o service_role.
create or replace function public.set_platform_admin(target_user_id uuid,enabled boolean)
returns void language plpgsql security definer set search_path=public as $$ begin
  update public.profiles set role=case when enabled then 'superadmin' else 'user' end,access_status=case when enabled then 'active' else access_status end,updated_at=now() where user_id=target_user_id;
end $$;
revoke all on function public.set_platform_admin(uuid,boolean) from public,anon,authenticated;

-- Sustituye la asignación histórica por correo para cuentas futuras.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$ begin
  insert into public.profiles(user_id,email,display_name,role,access_status,subscription_status)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1)),'user','trial','none') on conflict(user_id) do nothing;
  insert into public.marketing_preferences(user_id,email_marketing_consent,consent_source) values(new.id,false,'account_created') on conflict(user_id) do nothing;
  return new;
end $$;

insert into public.support_categories(key,label,ticket_type,sort_order) values
('organization','Organización','suggestion',10),('goals_planning','Metas y planificación','suggestion',20),('today','Vista de hoy','suggestion',30),('journal','Diario','suggestion',40),('progress','Progreso','suggestion',50),('training','Entrenamiento','suggestion',60),('nutrition','Alimentación','suggestion',70),('design','Diseño y experiencia','suggestion',80),('other','Otra','suggestion',90)
on conflict(key) do update set label=excluded.label,ticket_type=excluded.ticket_type,sort_order=excluded.sort_order;

insert into public.support_faqs(question,answer,sort_order) values
('¿Cómo edito una meta?','Abre Metas, selecciona la meta y usa sus acciones para ajustar avance, hitos o estado.',10),
('¿Cómo organizo mi semana?','En Planificación abre Semana, define tus tres prioridades y distribuye acciones con espacio realista.',20),
('¿Cómo cambio el idioma?','Ve a Ajustes y datos, busca Idioma y elige Español o English.',30),
('¿Cómo modifico las notificaciones?','En Ajustes puedes administrar preferencias disponibles. Las notificaciones del dispositivo también dependen del navegador.',40),
('¿Cómo elimino mi cuenta?','Abre Legal y privacidad, entra al Centro de Privacidad y radica una solicitud de eliminación de cuenta.',50),
('¿Cómo contacto a soporte?','Ve a Ajustes y datos, abre Ayuda y soporte y elige Contactar a soporte.',60)
on conflict do nothing;

insert into public.platform_settings(key,value,description) values
('activation_definition','{"window_days":7,"requires_onboarding":true,"minimum_goals":1,"minimum_completed_actions":1}'::jsonb,'Definición centralizada de usuaria activada'),
('event_taxonomy_version','"2026-08-27.1"'::jsonb,'Versión de la taxonomía de eventos')
on conflict(key) do nothing;
