import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../supabase/migrations/202609280001_launch_access_campaign.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("launch access migration safety", () => {
  it("seeds waitlist and newsletter capture disabled with a 20-request capacity", () => {
    expect(sql).toContain("values ('launch-20-v1','draft',false,false,false,20,30)");
    expect(sql).toContain("newsletter_registration_enabled boolean not null default false");
    expect(sql).toContain("accepted_requests integer not null default 0");
    expect(sql).toContain("client_requests_per_hour integer not null default 10");
    expect(sql).toContain("check (accepted_requests <= total_slots)");
  });

  it("protects campaign data behind service-role-only RPCs and RLS", () => {
    expect(sql).toContain("alter table public.launch_access_registrations enable row level security");
    expect(sql).toContain("revoke all on table public.launch_access_campaigns");
    expect(sql).toContain("from public,anon,authenticated,service_role");
    expect(sql).toContain("grant select on table public.launch_access_campaigns to service_role");
    expect(sql).toContain("grant execute on function public.request_launch_access");
    expect(sql).toContain("to service_role");
  });

  it("serializes capacity and applies atomic email and client rate limits", () => {
    const requestStart = sql.indexOf("create or replace function public.request_launch_access");
    const requestEnd = sql.indexOf("-- reclama exactamente", requestStart);
    const request = sql.slice(requestStart, requestEnd);
    expect(request).toContain("from public.launch_access_campaigns c");
    expect(request).toContain("for update");
    expect(request).toContain("campaign_row.accepted_requests>=campaign_row.total_slots");
    expect(request).toContain("when campaign_row.newsletter_registration_enabled then 'campaign_closed'::text");
    expect(request).toContain("else 'campaign_unavailable'::text");
    expect(request).toContain("accepted_requests=c.accepted_requests+1");
    expect(sql).toContain("'email',p_email_fingerprint");
    expect(sql).toContain("'client',p_client_fingerprint");
    expect(sql).toContain("on conflict(campaign_key,scope_kind,scope_fingerprint) do update");
  });

  it("rejects null request discriminators before capacity or persistence branches", () => {
    expect(sql).toContain("if p_email_fingerprint is null");
    expect(sql).toContain("or p_client_fingerprint is null");
    expect(sql).toContain("if p_request_type is null");
    expect(sql).toContain("or p_origin is null");
  });

  it("persists auditable consent without creating access or an immediate email", () => {
    const requestStart = sql.indexOf("create or replace function public.request_launch_access");
    const requestEnd = sql.indexOf("-- reclama exactamente", requestStart);
    const request = sql.slice(requestStart, requestEnd);
    expect(sql).toContain("registration_type text not null");
    expect(sql).toContain("'waitlist','newsletter_only'");
    expect(sql).toContain("newsletter_consent_at timestamptz");
    expect(sql).toContain("waitlist_requested_at timestamptz");
    expect(sql).toContain("newsletter_subscribed_at timestamptz");
    expect(sql).toContain("waitlist_requested_at=coalesce(r.waitlist_requested_at,checked_at)");
    expect(sql).toContain("newsletter_subscribed_at=checked_at");
    expect(sql).toContain("origin text not null check (origin in ('landing_launch'))");
    expect(request).toContain("'newsletter_subscribed'");
    expect(request).toContain("'request_received'");
    expect(request).not.toContain("insert into public.email_outbox");
    expect(request).not.toContain("insert into public.launch_access_grants");
  });

  it("claims only the exact confirmation and excludes launch from the global outbox", () => {
    expect(sql).toContain("create or replace function public.claim_launch_confirmation_email");
    expect(sql).toContain("where e.id=p_outbox_id and e.template_key='launch_confirmation'");
    expect(sql).toContain("where e.template_key<>'launch_confirmation'");
  });

  it("keeps the legacy confirmation path isolated and never allocates or activates", () => {
    const start = sql.indexOf("create or replace function public.confirm_launch_access_email");
    const end = sql.indexOf("-- el cron comercial", start);
    const confirmation = sql.slice(start, end);
    expect(confirmation).toContain("status='email_confirmed'");
    expect(confirmation).not.toContain("insert into public.launch_access_grants");
    expect(confirmation).not.toContain("update public.profiles");
    expect(sql).not.toContain("create table public.launch_access_grants");
  });
});
