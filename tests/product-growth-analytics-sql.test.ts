import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/202609160001_p2_growth_analytics.sql", import.meta.url),
  "utf8",
);
const normalized = migration.replace(/\s+/g, " ");

describe("P2 growth analytics migration", () => {
  it("keeps the client taxonomy closed and derives referred signup and activation on the server", () => {
    for (const eventName of [
      "weekly_recap_viewed",
      "weekly_recap_completed",
      "return_experience_viewed",
      "return_experience_action_clicked",
      "share_card_opened",
      "share_card_generated",
      "share_card_customized",
      "share_exported",
      "share_native_started",
      "share_card_created",
      "share_card_shared",
      "referral_prompt_viewed",
      "referral_link_created",
      "referral_link_copied",
      "referral_share_started",
      "referral_visit_recorded",
      "experiment_exposure_recorded",
    ]) expect(normalized).toContain(`'${eventName}'`);

    expect(normalized).toContain("current_id,'referral_signup_completed','referrals'");
    expect(normalized).toContain("current_id,'referral_activation_completed','referrals'");
    expect(normalized).not.toMatch(/allowed_client constant text\[\][^;]*'referral_signup_completed'/);
    expect(normalized).not.toMatch(/allowed_client constant text\[\][^;]*'referral_activation_completed'/);
  });

  it("enforces opaque referral ids and per-event closed metadata in SQL", () => {
    expect(normalized).toContain("metadata_text ~ '^ref_[a-f0-9]{32,64}$'");
    expect(normalized).toContain("next_event_name='referral_visit_recorded' then array['referral_link']");
    expect(normalized).toContain("next_event_name='weekly_recap_completed' then array['saved','saved_and_prepare']");
    expect(normalized).toContain("next_event_name='share_card_customized' then array['template','format','metrics','headline']");
    expect(normalized).toContain("when next_event_name='experiment_exposure_recorded' then array['dashboard','progress','weekly_plan']");
    expect(normalized).not.toContain("token_metadata_keys");
    expect(normalized).not.toContain("metadata_text ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$'");
    expect(normalized).not.toMatch(/journal_text|task_title|goal_title|display_name|\bemail\b/);
  });

  it("calculates D1, D7 and D30 retention with explicit eligible cohorts", () => {
    expect(normalized).toContain("join public.user_events e on e.user_id=p.user_id and e.taxonomy_version=2");
    expect(normalized).toContain("min(e.occurred_at) as first_observed_at");
    expect(normalized).toContain("o.first_observed_at<o.created_at+interval '1 day'");
    expect(normalized).toContain("e.occurred_at>=o.created_at+interval '1 day' and e.occurred_at<o.created_at+interval '2 days'");
    expect(normalized).toContain("e.occurred_at>=o.created_at+interval '7 days' and e.occurred_at<o.created_at+interval '8 days'");
    expect(normalized).toContain("e.occurred_at>=o.created_at+interval '30 days' and e.occurred_at<o.created_at+interval '31 days'");
    for (const metric of ["retention_1d_eligible_users", "retention_1d_users", "retention_7d_eligible_users", "retention_7d_users", "retention_30d_eligible_users", "retention_30d_users"]) {
      expect(normalized).toContain(`'${metric}'`);
    }
    expect(normalized).toContain("case when c.eligible_1d=0 then null");
    expect(normalized).toContain("case when c.eligible_7d=0 then null");
    expect(normalized).toContain("case when c.eligible_30d=0 then null");
  });

  it("calculates adoption and WAU only from observable v2 events", () => {
    expect(normalized).toContain("'weekly_active_users',a.active_7d");
    expect(normalized).toContain("from public.user_events e where e.taxonomy_version=2");
    expect(normalized).toContain("100.0*u.unique_users/nullif(o.total,0)");
    expect(normalized).not.toContain("u.unique_users/nullif((select count(*) from auth.users)");
  });

  it("exposes only aggregate weekly review, sharing and referral metrics", () => {
    for (const metric of [
      "weekly_review_users",
      "weekly_review_events",
      "weekly_review_rate",
      "share_users",
      "share_events",
      "share_rate",
      "trial_conversion_rate",
      "referral_visit_users",
      "referral_signup_users",
      "referral_activation_users",
      "referral_signup_rate",
      "referral_activation_rate",
    ]) expect(normalized).toContain(`'${metric}'`);
    expect(normalized).toContain("'weekly_review_eligible_users',a.active_7d");
    expect(normalized).toContain("'share_eligible_users',a.active_7d");
    expect(normalized).toContain("case when a.active_7d=0 then null");
    expect(normalized).toContain("e.event_name in ('share_exported','share_native_started')");
    expect(normalized).toContain("case when g.referral_visit_users=0 then null");
  });

  it("exposes honest paywall, checkout, trial and renewal funnels", () => {
    for (const metric of [
      "paywall_view_users",
      "checkout_users",
      "payment_users",
      "paywall_to_checkout_rate",
      "checkout_to_payment_rate",
      "trial_users",
      "trial_conversion_rate",
      "renewal_eligible_users",
      "renewal_users",
      "renewal_rate",
    ]) expect(normalized).toContain(`'${metric}'`);
    expect(normalized).toContain("gate.event_name='premium_gate_viewed' and gate.occurred_at<=e.occurred_at");
    expect(normalized).toContain("checkout.event_name='checkout_started' and checkout.occurred_at<=e.occurred_at");
    expect(normalized).toContain("trial.event_name='trial_started' and trial.occurred_at<=e.occurred_at");
    expect(normalized).toContain("case when f.payment_events=0 or f.checkout_users=0 then null");
    expect(normalized).toContain("case when f.payment_events=0 or f.trial_users=0 then null");
    expect(normalized).toContain("case when f.renewal_eligible_users=0 then null");
  });
});
