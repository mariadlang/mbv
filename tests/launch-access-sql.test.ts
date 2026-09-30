import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../supabase/migrations/202609280001_launch_access_campaign.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("launch access migration safety", () => {
  it("seeds the campaign disabled and keeps allocation and activation opt-in", () => {
    expect(sql).toContain("values ('launch-20-v1','draft',false,false,false,false,20,30)");
    expect(sql).toContain("allocation_enabled boolean not null default false");
    expect(sql).toContain("activation_enabled boolean not null default false");
  });

  it("protects campaign data behind service-role-only RPCs and RLS", () => {
    expect(sql).toContain("alter table public.launch_access_registrations enable row level security");
    expect(sql).toContain("revoke all on table public.launch_access_campaigns");
    expect(sql).toContain("from public,anon,authenticated,service_role");
    expect(sql).toContain("grant select on table public.launch_access_campaigns to service_role");
    expect(sql).toContain("grant execute on function public.request_launch_access");
    expect(sql).toContain("to service_role");
  });

  it("stores only a token hash and applies atomic email and client rate limits", () => {
    expect(sql).toContain("token_hash bytea not null");
    expect(sql).toContain("digest(convert_to(next_token_nonce,'utf8'),'sha256')");
    expect(sql).toContain("'email',p_email_fingerprint");
    expect(sql).toContain("'client',p_client_fingerprint");
    expect(sql).toContain("on conflict(campaign_key,scope_kind,scope_fingerprint) do update");
  });

  it("claims only the exact confirmation and excludes launch from the global outbox", () => {
    expect(sql).toContain("create or replace function public.claim_launch_confirmation_email");
    expect(sql).toContain("where e.id=p_outbox_id and e.template_key='launch_confirmation'");
    expect(sql).toContain("where e.template_key<>'launch_confirmation'");
  });

  it("confirmation changes only registration state and never allocates or activates", () => {
    const start = sql.indexOf("create or replace function public.confirm_launch_access_email");
    const end = sql.indexOf("-- el cron comercial", start);
    const confirmation = sql.slice(start, end);
    expect(confirmation).toContain("status='email_confirmed'");
    expect(confirmation).not.toContain("insert into public.launch_access_grants");
    expect(confirmation).not.toContain("update public.profiles");
    expect(confirmation).not.toContain("allocation_enabled=true");
    expect(confirmation).not.toContain("activation_enabled=true");
  });
});
