import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/202609190001_commercial_access_v2.sql", import.meta.url),
  "utf8",
);
const normalized = migration.replace(/\s+/g, " ");

const functionBody = (name: string) => {
  const startPattern = new RegExp(`create (?:or replace )?function public\\.${name}\\b`, "i");
  const start = migration.search(startPattern);
  if (start < 0) return "";
  const bodyStart = migration.indexOf("as $$", start);
  const bodyEnd = migration.indexOf("$$;", bodyStart);
  return migration.slice(bodyStart, bodyEnd).replace(/\s+/g, " ");
};

describe("commercial access v2 forward migration", () => {
  it("starts new accounts on Gratis and preserves dated legacy trials", () => {
    expect(normalized).toContain("'user','free','none'");
    expect(normalized).toContain("when p.trial_started_at is not null and p.trial_ends_at > now() then 'trial'");
    expect(normalized).toContain("when p.trial_started_at is not null and p.trial_ends_at is not null then 'trial_expired'");
    expect(normalized).not.toContain("now() + interval '15 days'");
  });

  it("counts at most one server-derived local date with a timezone fixed on first activity", () => {
    expect(normalized).toContain("create or replace function public.record_commercial_activity(next_action_type text)");
    expect(normalized).toContain("server_event_at timestamptz := statement_timestamp()");
    expect(normalized).toContain("server_local_date := (server_event_at at time zone timezone_name)::date");
    expect(normalized).toContain("constraint commercial_daily_activity_one_day unique(user_id,campaign_key,local_date)");
    expect(normalized).toContain("on conflict on constraint commercial_daily_activity_one_day do nothing");
    expect(normalized).toContain("select cp.fixed_timezone into timezone_name");
    expect(normalized).not.toMatch(/record_commercial_activity\([^)]*(date|timestamptz)/);
  });

  it("persists the 30-day evidence and emits one idempotent admin alert", () => {
    expect(normalized).toContain("values ('consistency-30-v1',30,30,true)");
    expect(normalized).toContain("where d.local_date=server_local_date-((d.position-1)::integer)");
    expect(normalized).toContain("if calculated_streak>=required_days then");
    expect(normalized).toContain("create table public.commercial_trial_eligibility");
    expect(normalized).toContain("'commercial_trial_eligible:'||active_campaign||':'||current_id::text");
    expect(normalized).toContain("on conflict(dedupe_key) do nothing");
  });

  it("requires an explicit superadmin confirmation and grants one exact 30-day trial", () => {
    expect(normalized).toContain("confirmation is distinct from 'ACTIVAR_TRIAL_30_DIAS'");
    expect(normalized).toContain("if public.has_paid_premium(target_user_id) then");
    expect(normalized).toContain("'conflict_paid_premium'::text");
    expect(normalized).toContain("unique(user_id,campaign_key)");
    expect(normalized).toContain("check (trial_ends_at = trial_started_at + interval '30 days')");
    expect(normalized).toContain("'already_activated'::text");
    expect(normalized).toContain("insert into public.access_audit_log");
    expect(normalized).toContain("if target_email ~* '^[^@[:space:]]+@[^@[:space:]]+$' then insert into public.email_outbox(");
  });

  it("serializes admin activation and payment reconciliation with the same account lock", () => {
    const admin = functionBody("admin_activate_commercial_trial");
    const checkout = functionBody("create_checkout_intent");
    const reconcile = functionBody("reconcile_billing_event");
    const adminLock = "pg_advisory_xact_lock(hashtextextended(target_user_id::text,202609190001))";
    const userLock = "pg_advisory_xact_lock(hashtextextended(current_id::text,202609190001))";

    expect(admin).toContain(adminLock);
    expect(checkout).toContain(userLock);
    expect(reconcile).toContain(adminLock);
    expect(admin.indexOf(adminLock)).toBeLessThan(admin.indexOf("from public.profiles p where p.user_id=target_user_id for update"));
    expect(admin.indexOf("if public.has_paid_premium(target_user_id) then")).toBeLessThan(admin.indexOf("raise exception 'BILLING_CHECKOUT_IN_PROGRESS'"));
    expect(admin.indexOf("raise exception 'BILLING_CHECKOUT_IN_PROGRESS'")).toBeLessThan(admin.indexOf("insert into public.commercial_trial_grants"));
    expect(reconcile.indexOf("if target_user_id is null then")).toBeLessThan(reconcile.indexOf(adminLock));
    expect(reconcile.indexOf(adminLock)).toBeLessThan(reconcile.indexOf("where p.user_id=target_user_id for update"));
    expect(reconcile.indexOf(adminLock)).toBeLessThan(reconcile.indexOf("where bp.provider='mercado_pago' and bp.provider_payment_id=provider_payment_key for update"));
  });

  it("centralizes effective access and exposes the paid period to Mi plan", () => {
    expect(normalized).toContain("create function public.ensure_user_access()");
    expect(normalized).toContain("create or replace function public.get_my_commercial_plan()");
    for (const field of [
      "eligibility_status text",
      "current_streak_days integer",
      "eligible_at timestamptz",
      "current_period_starts_at timestamptz",
      "current_period_ends_at timestamptz",
      "next_payment_at timestamptz",
      "cancel_at_period_end boolean",
    ]) expect(normalized).toContain(field);
    expect(normalized).toContain("grant execute on function public.get_my_commercial_plan() to authenticated");
  });

  it("keeps billing mutations server-only and recoverable through leases", () => {
    for (const table of [
      "commercial_checkout_intents",
      "billing_subscriptions",
      "billing_payments",
      "billing_provider_events",
      "admin_notifications",
      "email_outbox",
    ]) expect(normalized).toContain(`create table public.${table}`);
    expect(normalized).toContain("claim_expires_at=checked_at+interval '5 minutes'");
    expect(normalized).toContain("event_row.lease_expires_at<=checked_at");
    expect(normalized).toContain("processing_status='failed',result_code=p_error_code");
    expect(normalized).toContain("grant execute on function public.fail_billing_provider_event(uuid,text) to service_role");
    expect(normalized).toContain("grant execute on function public.create_checkout_intent(text) to authenticated");
    expect(normalized).toContain("grant execute on function public.reconcile_billing_event(");
    expect(normalized).toContain(") to service_role");
    expect(normalized).toContain("from public,anon,authenticated");
    expect(normalized).not.toContain("grant execute on function public.reconcile_billing_event( uuid,text,text,text,text,text,text,integer,text,timestamptz,timestamptz,timestamptz,timestamptz,jsonb ) to authenticated");
  });

  it("serializes checkout per account and does not release provider-backed checkout by time alone", () => {
    expect(normalized).toContain("create unique index commercial_checkout_one_open_uidx on public.commercial_checkout_intents(user_id)");
    expect(normalized).toContain("create unique index billing_subscriptions_one_current_uidx on public.billing_subscriptions(user_id)");
    expect(normalized).toContain("perform pg_advisory_xact_lock(hashtextextended(current_id::text,202609190001))");
    expect(normalized).toContain("raise exception 'BILLING_SUBSCRIPTION_ALREADY_EXISTS'");
    expect(normalized).toContain("if current_intent.plan_interval<>next_plan then raise exception 'CHECKOUT_ALREADY_OPEN'");
    expect(normalized).toContain("i.provider_subscription_id is null and i.checkout_url is null");
    expect(normalized).not.toContain("where i.status in ('created','provider_pending','ready') and i.expires_at<=p_now");
  });

  it("recovers abandoned provider checkouts only after a fresh terminal confirmation", () => {
    const complete = functionBody("complete_checkout_intent");
    const closeStale = functionBody("close_stale_checkout_intent");

    expect(complete).toContain("expires_at=greatest(i.expires_at,checked_at+interval '24 hours')");
    expect(closeStale).toContain("raise exception 'CHECKOUT_PROVIDER_STATE_NOT_TERMINAL'");
    expect(closeStale).toContain("when 'terminated' then 'cancelled'");
    expect(closeStale).toContain("if intent_row.expires_at>checked_at then raise exception 'CHECKOUT_STILL_FRESH'");
    expect(closeStale).toContain("raise exception 'STALE_PROVIDER_CHECKOUT_STATE'");
    expect(closeStale).toContain("raise exception 'CHECKOUT_HAS_PAID_PAYMENT'");
    expect(closeStale).toContain("raise exception 'CHECKOUT_HAS_CURRENT_SUBSCRIPTION'");
    expect(closeStale).toContain("where s.checkout_intent_id=intent_row.id and s.status='pending'");
    expect(closeStale).toContain("provider_terminal_confirmed_at=checked_at");
    expect(normalized).toContain("then 'CLOSED_CHECKOUT_PAYMENT_REVIEW' else 'CHECKOUT_TERMINALLY_CLOSED' end");
    expect(normalized).toContain("grant execute on function public.close_stale_checkout_intent(uuid,text,text,timestamptz) to service_role");
    expect(normalized).not.toContain("grant execute on function public.close_stale_checkout_intent(uuid,text,text,timestamptz) to authenticated");
  });

  it("keeps checkout creation retryable after transient worker failures", () => {
    const create = functionBody("create_checkout_intent");
    const release = functionBody("release_checkout_intent");

    expect(create).toContain("current_intent.claim_token is null or current_intent.claim_expires_at<=checked_at");
    expect(create).toContain("claim_attempts=i.claim_attempts+1");
    expect(release).toContain("claim_token=null,claim_expires_at=null,last_error_code=p_error_code");
    expect(release).toContain("status='created'");
  });

  it("does not grant paid access from an authorized provider state alone", () => {
    expect(normalized).toContain("when normalized_payment_status='approved' and payment_signal_current then 'active'");
    expect(normalized).toContain("else 'pending' end");
    expect(normalized).toContain("result_code='PAYMENT_ID_REQUIRED'");
    expect(normalized).toContain("lower(coalesce(p_payment_status,'')) in ('approved','succeeded','paid') and p_amount_minor is null");
    expect(normalized).toContain("and nullif(trim(coalesce(p_currency,'')),'') is null");
    expect(normalized).toContain("if p_period_end is null or p_period_end<=effective_period_start then");
    expect(normalized).toContain("processing_status='ignored',result_code='MISSING_PAID_PERIOD'");
    expect(normalized).toContain("elsif normalized_payment_status='approved' and payment_applied then update public.profiles");
    expect(normalized).not.toContain("when 'authorized' then 'approved'");
  });

  it("preserves paid-through cancellation and ignores duplicate or stale payment side effects", () => {
    expect(normalized).toContain("coalesce(p_period_end,subscription_row.current_period_end)>checked_at then 'cancel_at_period_end'");
    expect(normalized).toContain("outcome := 'DUPLICATE_PAYMENT_IGNORED'");
    expect(normalized).toContain("outcome := 'STALE_PAYMENT_IGNORED'");
    expect(normalized).toContain("when subscription_row.status in ('active','cancel_at_period_end','past_due') then subscription_row.status");
    expect(normalized).toContain("if normalized_payment_status='approved' and payment_applied then update public.email_outbox");
    expect(normalized).toContain("case when had_approved_payment then 'subscription_renewed' else 'premium_welcome' end");
    expect(normalized).toContain("payload=coalesce(e.payload,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb)");
    expect(normalized).toContain("where bp.subscription_id=subscription_row.id and bp.paid_at is not null");
  });

  it("revalidates a paid conflict after Paid ends without consuming the reward", () => {
    const admin = functionBody("admin_activate_commercial_trial");
    const reconcile = functionBody("reconcile_billing_event");
    const maintenance = functionBody("run_commercial_maintenance");

    expect(normalized).toContain("revalidated_at timestamptz");
    expect(admin).toContain("if eligibility_state='conflict_paid_premium' then update public.commercial_trial_eligibility e set status='eligible',conflict_reason=null,revalidated_at=activation_time");
    expect(admin.indexOf("status='eligible',conflict_reason=null,revalidated_at=activation_time")).toBeLessThan(admin.indexOf("if eligibility_state<>'eligible' then"));
    expect(reconcile).toContain("status='eligible',conflict_reason=null,revalidated_at=checked_at");
    expect(reconcile).toContain("not exists( select 1 from public.commercial_trial_grants g where g.user_id=target_user_id )");
    expect(maintenance).toContain("where e.status='conflict_paid_premium'");
    expect(maintenance).toContain("s.current_period_end is null or s.current_period_end>p_now");
    expect(maintenance).toContain("status='eligible',conflict_reason=null,revalidated_at=p_now");
    expect(normalized).toContain("when e.status='conflict_paid_premium' and g.id is null and not public.has_paid_premium(p.user_id) and not exists(");
  });

  it("does not tell paid Premium users that an expired reward returns them to Gratis", () => {
    expect(normalized).toContain("and not public.has_paid_premium(current_id) then insert into public.email_outbox(");
    expect(normalized).toContain("and not exists( select 1 from public.billing_subscriptions s where s.user_id=p.user_id");
  });

  it("enables RLS and offers idempotent maintenance without client write policies", () => {
    expect(normalized).toContain("alter table public.billing_provider_events enable row level security");
    expect(normalized).toContain("alter table public.email_outbox enable row level security");
    expect(normalized).toContain("create or replace function public.run_commercial_maintenance(p_now timestamptz default now())");
    expect(normalized).toContain("grant execute on function public.run_commercial_maintenance(timestamptz) to service_role");
    expect(normalized).not.toMatch(/create policy [^ ]+ on public\.billing_provider_events for (insert|update|delete) to authenticated/);
    expect(normalized).not.toMatch(/create policy [^ ]+ on public\.email_outbox for (insert|update|delete) to authenticated/);
  });

  it("leases email delivery work and records provider outcomes server-side", () => {
    expect(normalized).toContain("create or replace function public.claim_next_email(p_now timestamptz default now())");
    expect(normalized).toContain("for update skip locked limit 1");
    expect(normalized).toContain("claim_token=issued_claim,claim_expires_at=p_now+interval '5 minutes'");
    expect(normalized).toContain("create or replace function public.complete_email_delivery(");
    expect(normalized).toContain("if p_status is null or p_status not in ('accepted','delivered','failed')");
    expect(normalized).toContain("next_attempt_at=case when e.attempt_count<8 then p_next_retry_at else null end");
    expect(normalized).toContain("'generated','queued','accepted','delivered','failed','superseded'");
    expect(normalized).toContain("target_user_id,'user',target_email,'renewal_pending'");
    expect(normalized).toContain("and provider_payment_key is not null and (payment_applied or subscription_applied) then");
    expect(normalized).toContain("e.template_data->>'provider_payment_id'=provider_payment_key");
    expect(normalized).toContain("and e.status in ('generated','queued','failed')");
    expect(normalized).toContain("'next_review_at',checked_at+interval '15 minutes' ),'generated',checked_at+interval '15 minutes'");
    expect(normalized).toContain("create or replace function public.revalidate_email_delivery(");
    expect(normalized).toContain("and bp.provider_payment_id=payment_key and bp.status='approved' and bp.paid_at is not null");
    expect(normalized).toContain("grant execute on function public.revalidate_email_delivery(uuid,uuid) to service_role");
    expect(normalized).toContain("grant execute on function public.claim_next_email(timestamptz) to service_role");
    expect(normalized).toContain("grant execute on function public.complete_email_delivery(uuid,uuid,text,text,text,timestamptz) to service_role");
    for (const field of ["'user_email',profile_email", "'user_name',profile_name", "'eligible_at',server_event_at", "'period_start'", "'period_end'", "'next_payment_at'", "'cancelled_at'", "'access_until'"]) {
      expect(normalized).toContain(field);
    }
  });

  it("configures the operational admin recipient without assigning an account role", () => {
    expect(normalized).toContain("create or replace function public.set_admin_notification_email(p_email text)");
    expect(normalized).toContain("'admin_notification_email',to_jsonb(normalized_email)");
    expect(normalized).toContain("delete from public.platform_settings s where s.key='admin_notification_email'");
    expect(normalized).toContain("grant execute on function public.set_admin_notification_email(text) to service_role");
    const functionBody = normalized.split("create or replace function public.set_admin_notification_email", 2)[1]?.split("create or replace function public.record_commercial_activity", 1)[0] ?? "";
    expect(functionBody).not.toContain("role=");
  });

  it("declares the paid cancellation flag once per public access RPC signature", () => {
    const ensure = /create function public\.ensure_user_access\(\)\s+returns table\(([\s\S]*?)\)\s+language plpgsql/.exec(migration)?.[1] ?? "";
    const myPlan = /create or replace function public\.get_my_commercial_plan\(\)\s+returns table\(([\s\S]*?)\)\s+language sql/.exec(migration)?.[1] ?? "";
    expect(ensure.match(/cancel_at_period_end boolean/g) ?? []).toHaveLength(1);
    expect(myPlan.match(/cancel_at_period_end boolean/g) ?? []).toHaveLength(1);
  });
});
