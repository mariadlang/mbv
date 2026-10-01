-- Activación auditable y reversible mediante los tres gates de campaña.
-- No habilita correo, trial, Premium, cuentas ni asignación de beneficios.

begin;

update public.launch_access_campaigns
set state='collecting',
    registration_enabled=true,
    newsletter_registration_enabled=true,
    email_delivery_enabled=false,
    total_slots=20,
    trial_days=30,
    client_requests_per_hour=3,
    starts_at=coalesce(starts_at,now()),
    updated_at=now()
where campaign_key='launch-20-v1'
  and accepted_requests=0
  and state='draft'
  and not registration_enabled
  and not newsletter_registration_enabled
  and not email_delivery_enabled;

do $$
begin
  if not exists(
    select 1 from public.launch_access_campaigns
    where campaign_key='launch-20-v1'
      and state='collecting'
      and registration_enabled
      and newsletter_registration_enabled
      and not email_delivery_enabled
      and total_slots=20
      and client_requests_per_hour=3
      and accepted_requests=0
  ) then
    raise exception 'LAUNCH_CAMPAIGN_ACTIVATION_PRECONDITION_FAILED';
  end if;
end;
$$;

commit;
