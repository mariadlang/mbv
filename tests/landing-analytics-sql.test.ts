import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/202609160002_landing_analytics.sql", import.meta.url),
  "utf8",
);
const normalized = migration.replace(/\s+/g, " ");

const landingEvents = [
  "landing_view",
  "landing_nav_click",
  "landing_trial_cta_click",
  "landing_login_click",
  "benefits_view",
  "how_it_works_view",
  "premium_benefits_view",
  "pricing_view",
  "pricing_monthly_selected",
  "pricing_annual_selected",
  "premium_checkout_click",
  "faq_open",
  "paywall_view",
  "trial_start",
] as const;

describe("landing analytics forward migration", () => {
  it("extends the RPC allowlist without mutating the applied P2 migration", () => {
    for (const eventName of landingEvents) expect(normalized).toContain(`'${eventName}'`);
    expect(normalized).toContain("create or replace function public.record_user_event(");
    expect(normalized).toContain("grant execute on function public.record_user_event(text,text,text,text,jsonb,timestamptz) to authenticated");
    expect(normalized).toContain("revoke all on function public.record_user_event(text,text,text,text,jsonb,timestamptz) from public,anon");
    expect(normalized).toContain("'event_taxonomy_version','\"2026-09-16.4\"'::jsonb");
  });

  it("maps every new event to a canonical feature instead of trusting next_feature", () => {
    expect(normalized).toContain("'landing_trial_cta_click','landing_login_click','benefits_view', 'how_it_works_view','faq_open','trial_start' ) then 'acquisition'");
    expect(normalized).toContain("'premium_gate_viewed','upgrade_opened','premium_benefits_view','paywall_view') then 'premium'");
    expect(normalized).toContain("'pricing_view','pricing_monthly_selected','pricing_annual_selected') then 'pricing'");
    expect(normalized).toContain("'checkout_started','premium_checkout_click') then 'checkout'");
    expect(normalized).toContain("current_id,next_event_name,canonical_feature,safe,next_session_id");
  });

  it("keeps sources, sections and routes on explicit closed vocabularies", () => {
    for (const source of [
      "landing_header",
      "landing_hero",
      "landing_benefits",
      "landing_how_it_works",
      "landing_included",
      "landing_showcase",
      "landing_premium",
      "landing_pricing",
      "landing_comparison",
      "landing_after_trial",
      "landing_footer",
      "landing_faq",
      "upgrade_page",
    ]) expect(normalized).toContain(`'${source}'`);
    for (const section of ["como-funciona", "que-incluye", "beneficios", "planes", "faq", "monthly", "annual"]) {
      expect(normalized).toContain(`'${section}'`);
    }
    expect(normalized).toContain("when next_event_name='landing_nav_click' then array['/','/trial','/login','/upgrade']");
    expect(normalized).toContain("when next_event_name in ('landing_trial_cta_click','trial_start') then array['/trial']");
    expect(normalized).toContain("when next_event_name='premium_checkout_click' then array['/upgrade']");
    expect(normalized).not.toContain("metadata_text ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$'");
    expect(normalized).not.toMatch(/question_text|link_label|cta_label|display_name|journal_text|\bemail\b/);
  });

  it("keeps trial intent separate from verified trial_started", () => {
    expect(normalized).toContain("when next_event_name in ('landing_trial_cta_click','trial_start') then array[");
    expect(normalized).toContain("'trial_started','login_succeeded','app_session_started','sign_up_completed') then 'account'");
    expect(normalized).toContain("when next_event_name in ('signup_started','signup_completed','sign_up_completed','email_verified','trial_started','login_succeeded','app_session_started') then array['email_form','google','magic_link','authenticated_access','first_verified_access','authenticated_app']");
  });
});
