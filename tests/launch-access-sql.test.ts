import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/202609280001_launch_access_campaign.sql", import.meta.url),
  "utf8",
).toLowerCase();
const activation = readFileSync(
  new URL("../supabase/migrations/202609300001_activate_launch_access_campaign.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("launch access migration safety", () => {
  it("creates the campaign fail-closed and activation keeps email delivery disabled", () => {
    expect(migration).toContain("values ('launch-20-v1','draft',false,false,false,20,30)");
    expect(migration).toContain("accepted_requests integer not null default 0");
    expect(migration).toContain("client_requests_per_hour integer not null default 10");
    expect(activation).toContain("state='collecting'");
    expect(activation).toContain("registration_enabled=true");
    expect(activation).toContain("newsletter_registration_enabled=true");
    expect(activation).toContain("email_delivery_enabled=false");
    expect(activation).toContain("client_requests_per_hour=3");
    expect(activation).toContain("accepted_requests=0");
  });

  it("isolates all personal rows behind RLS and a service-role-only RPC", () => {
    expect(migration).toContain("alter table public.launch_access_registrations enable row level security");
    expect(migration).toContain("alter table public.launch_access_request_receipts enable row level security");
    expect(migration).toContain("revoke all on table public.launch_access_campaigns");
    expect(migration).toContain("from public,anon,authenticated,service_role");
    expect(migration).toContain("grant select on table public.launch_access_campaigns to service_role");
    expect(migration).toContain("grant execute on function public.request_launch_access");
  });

  it("replays an opaque idempotency receipt before mutable capacity checks", () => {
    const receiptLookup = migration.indexOf("from public.launch_access_request_receipts r");
    const capacityCheck = migration.indexOf("campaign_row.accepted_requests>=campaign_row.total_slots");
    expect(receiptLookup).toBeGreaterThan(0);
    expect(capacityCheck).toBeGreaterThan(receiptLookup);
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("receipt_row.payload_fingerprint<>p_payload_fingerprint");
    expect(migration).toContain("'request_mismatch'::text");
    expect(migration).toContain("checked_at+interval '7 days'");
    expect(migration).toContain("r.expires_at<=checked_at");
  });

  it("serializes capacity and limits by client without an email timing bucket", () => {
    expect(migration).toContain("from public.launch_access_campaigns c");
    expect(migration).toContain("for update");
    expect(migration).toContain("accepted_requests=c.accepted_requests+1");
    expect(migration).toContain("client_fingerprint text not null");
    expect(migration.indexOf("insert into public.launch_access_rate_limits")).toBeLessThan(
      migration.indexOf("from public.launch_access_campaigns c\n  where c.campaign_key=p_campaign_key\n  for update"),
    );
    expect(migration).not.toContain("p_email_fingerprint");
    expect(migration).not.toContain("scope_kind in ('email','client')");
  });

  it("honors the newsletter gate and records auditable explicit consent", () => {
    expect(migration).toContain("p_newsletter_opt_in and not campaign_row.newsletter_registration_enabled");
    expect(migration).toContain("newsletter_consent_at timestamptz");
    expect(migration).toContain("newsletter_consent_version text");
    expect(migration).toContain("newsletter_unsubscribed_at timestamptz");
    expect(migration).toContain("create or replace function public.unsubscribe_launch_newsletter");
    expect(migration).toContain("newsletter_preference=false");
    expect(migration).toContain("'launch-modal-v1'");
    expect(migration).toContain("origin text not null check (origin in ('landing_launch'))");
  });

  it("does not modify the commercial email system or allocate product access", () => {
    expect(migration).not.toContain("alter table public.email_outbox");
    expect(migration).not.toContain("claim_next_email");
    expect(migration).not.toContain("insert into public.email_outbox");
    expect(migration).not.toContain("launch_access_grants");
    expect(migration).not.toContain("update public.profiles");
    expect(activation).not.toContain("email_outbox");
  });

  it("uses one campaign-close deadline for retention and closes expired campaigns", () => {
    expect(migration).toContain("campaign_row.updated_at+interval '12 months'");
    expect(migration).toContain("updated_at=c.ends_at");
    expect(migration).not.toContain("then checked_at+interval '12 months'");
    const purge = migration.slice(migration.indexOf("create or replace function public.purge_launch_access_expired"));
    expect(purge.indexOf("delete from public.launch_access_request_receipts")).toBeLessThan(
      purge.indexOf("update public.launch_access_campaigns c set"),
    );
  });
});
