-- My Best Version: evidencia mínima de consentimiento, versionado legal y PQR.
-- El planner, journal, fitness, alimentación y finanzas siguen en IndexedDB y
-- no se copian a estas tablas.

create table if not exists public.legal_documents (
  id text primary key,
  type text not null,
  version text not null,
  effective_date date not null,
  published_at timestamptz not null default now(),
  content_reference text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (type, version)
);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms','data_processing','marketing','sensitive_wellness','adult_declaration','cookies_functional','cookies_analytics','cookies_marketing')),
  document_version text not null,
  consented_at timestamptz not null default now(),
  method text not null check (method in ('signup_checkbox','oauth_gate','privacy_center','feature_gate','cookie_manager')),
  status text not null check (status in ('granted','withdrawn')),
  withdrawn_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, consent_type, document_version)
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('data_inquiry','data_claim','correction','data_deletion','consent_revocation','account_deletion','pqr','retract','security')),
  subject text not null,
  description text not null,
  contact_email text not null,
  status text not null default 'received' check (status in ('received','in_review','answered','closed')),
  deadline_at timestamptz,
  response text,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists user_consents_user_idx on public.user_consents(user_id, consented_at desc);
create index if not exists privacy_requests_user_idx on public.privacy_requests(user_id, created_at desc);
create index if not exists privacy_requests_status_idx on public.privacy_requests(status, deadline_at);

alter table public.legal_documents enable row level security;
alter table public.user_consents enable row level security;
alter table public.privacy_requests enable row level security;

drop policy if exists "legal_documents_read_active" on public.legal_documents;
create policy "legal_documents_read_active" on public.legal_documents for select to anon, authenticated using (active);

drop policy if exists "user_consents_select_self" on public.user_consents;
create policy "user_consents_select_self" on public.user_consents for select to authenticated using (user_id = auth.uid());
drop policy if exists "user_consents_insert_self" on public.user_consents;
create policy "user_consents_insert_self" on public.user_consents for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "user_consents_update_self" on public.user_consents;
create policy "user_consents_update_self" on public.user_consents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "privacy_requests_select_self_or_admin" on public.privacy_requests;
create policy "privacy_requests_select_self_or_admin" on public.privacy_requests for select to authenticated using (user_id = auth.uid() or public.is_superadmin());
drop policy if exists "privacy_requests_insert_self" on public.privacy_requests;
create policy "privacy_requests_insert_self" on public.privacy_requests for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "privacy_requests_admin_update" on public.privacy_requests;
create policy "privacy_requests_admin_update" on public.privacy_requests for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

create or replace function public.add_business_days(start_at timestamptz, business_days integer)
returns timestamptz language plpgsql immutable
as $$
declare result_at timestamptz := start_at; added integer := 0;
begin
  while added < business_days loop
    result_at := result_at + interval '1 day';
    if extract(isodow from result_at) between 1 and 5 then added := added + 1; end if;
  end loop;
  return result_at;
end;
$$;

create or replace function public.create_privacy_request(
  next_type text,
  next_subject text,
  next_description text,
  next_contact_email text,
  next_attachment_path text default null
)
returns setof public.privacy_requests
language plpgsql security definer set search_path = public
as $$
declare current_id uuid := auth.uid(); created_request public.privacy_requests;
begin
  if current_id is null then raise exception 'authentication required'; end if;
  if next_type not in ('data_inquiry','data_claim','correction','data_deletion','consent_revocation','account_deletion','pqr','retract','security') then raise exception 'unsupported request type'; end if;
  if length(trim(next_subject)) < 4 or length(trim(next_description)) < 20 then raise exception 'request details are incomplete'; end if;

  insert into public.privacy_requests(reference, user_id, request_type, subject, description, contact_email, deadline_at, attachment_path)
  values (
    'MBV-' || to_char(now() at time zone 'America/Bogota', 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    current_id,
    next_type,
    trim(next_subject),
    trim(next_description),
    lower(trim(next_contact_email)),
    public.add_business_days(now(), case when next_type = 'data_inquiry' then 10 else 15 end),
    next_attachment_path
  ) returning * into created_request;
  return next created_request;
end;
$$;

revoke all on function public.create_privacy_request(text, text, text, text, text) from public;
grant execute on function public.create_privacy_request(text, text, text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('privacy-request-attachments', 'privacy-request-attachments', false, 2097152, array['application/pdf','image/jpeg','image/png','text/plain'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "privacy_attachments_insert_self" on storage.objects;
create policy "privacy_attachments_insert_self" on storage.objects for insert to authenticated
with check (bucket_id = 'privacy-request-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "privacy_attachments_select_self_or_admin" on storage.objects;
create policy "privacy_attachments_select_self_or_admin" on storage.objects for select to authenticated
using (bucket_id = 'privacy-request-attachments' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_superadmin()));

insert into public.legal_documents(id, type, version, effective_date, content_reference, active)
values
  ('terms-2026-08-27-co-1', 'terms', '2026-08-27.co-1', date '2026-08-27', '/terms', true),
  ('data-policy-2026-08-27-co-1', 'data_policy', '2026-08-27.co-1', date '2026-08-27', '/data-policy', true),
  ('privacy-notice-2026-08-27-co-1', 'privacy_notice', '2026-08-27.co-1', date '2026-08-27', '/privacy', true),
  ('cookies-2026-08-27-co-1', 'cookies', '2026-08-27.co-1', date '2026-08-27', '/cookies', true),
  ('payments-2026-08-27-co-1', 'payments', '2026-08-27.co-1', date '2026-08-27', '/payments', true),
  ('retract-2026-08-27-co-1', 'retract', '2026-08-27.co-1', date '2026-08-27', '/retract', true),
  ('ai-2026-08-27-co-1', 'ai', '2026-08-27.co-1', date '2026-08-27', '/ai-privacy', true)
on conflict (id) do update set content_reference = excluded.content_reference, active = excluded.active;

create or replace function public.capture_signup_consents()
returns trigger language plpgsql security definer set search_path = public
as $$
declare legal_version text := coalesce(new.raw_user_meta_data ->> 'legal_version', '2026-08-27.co-1');
begin
  if new.raw_user_meta_data ? 'terms_accepted_at' then
    insert into public.user_consents(user_id, consent_type, document_version, consented_at, method, status, evidence)
    values(new.id, 'terms', legal_version, (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz, 'signup_checkbox', 'granted', '{"source":"auth_metadata"}')
    on conflict (user_id, consent_type, document_version) do nothing;
  end if;
  if new.raw_user_meta_data ? 'data_processing_accepted_at' then
    insert into public.user_consents(user_id, consent_type, document_version, consented_at, method, status, evidence)
    values(new.id, 'data_processing', legal_version, (new.raw_user_meta_data ->> 'data_processing_accepted_at')::timestamptz, 'signup_checkbox', 'granted', '{"source":"auth_metadata"}')
    on conflict (user_id, consent_type, document_version) do nothing;
  end if;
  if new.raw_user_meta_data ? 'adult_declared_at' then
    insert into public.user_consents(user_id, consent_type, document_version, consented_at, method, status, evidence)
    values(new.id, 'adult_declaration', legal_version, (new.raw_user_meta_data ->> 'adult_declared_at')::timestamptz, 'signup_checkbox', 'granted', '{"source":"auth_metadata"}')
    on conflict (user_id, consent_type, document_version) do nothing;
  end if;
  if coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false) then
    insert into public.user_consents(user_id, consent_type, document_version, consented_at, method, status, evidence)
    values(new.id, 'marketing', legal_version, coalesce((new.raw_user_meta_data ->> 'marketing_accepted_at')::timestamptz, now()), 'signup_checkbox', 'granted', '{"source":"auth_metadata"}')
    on conflict (user_id, consent_type, document_version) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_consents_captured on auth.users;
create trigger on_auth_user_consents_captured after insert on auth.users for each row execute procedure public.capture_signup_consents();

-- Tarea administrativa pendiente: verificar obligación de inscripción en RNBD
-- según la naturaleza jurídica y activos del Responsable cuando estos datos sean definidos.
