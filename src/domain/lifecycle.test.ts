import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIFECYCLE_PREFERENCES,
  LIFECYCLE_RULES,
  evaluateLifecycleEligibility,
  type LifecycleDeliveryRecord,
} from "./lifecycle";

const returnRule = LIFECYCLE_RULES.find((rule) => rule.id === "return_after_inactivity")!;

describe("lifecycle frequency and consent rules", () => {
  it("keeps optional communication disabled by default", () => {
    expect(DEFAULT_LIFECYCLE_PREFERENCES).toEqual({
      product: true,
      reminders: false,
      weekly_summary: false,
      news: false,
      marketing: false,
    });
  });

  it("allows one helpful return message without marketing consent", () => {
    expect(evaluateLifecycleEligibility({
      rule: returnRule,
      preferences: DEFAULT_LIFECYCLE_PREFERENCES,
      marketingConsent: false,
      history: [],
      triggerKey: "return:2026-W38",
      now: new Date("2026-09-16T12:00:00.000Z"),
    })).toEqual({ eligible: true, reason: "eligible" });
  });

  it("honors opt-out for non-transactional weekly summaries", () => {
    const weeklyRule = LIFECYCLE_RULES.find((rule) => rule.id === "weekly_review")!;
    expect(evaluateLifecycleEligibility({
      rule: weeklyRule,
      preferences: DEFAULT_LIFECYCLE_PREFERENCES,
      marketingConsent: false,
      history: [],
      triggerKey: "weekly-review:2026-W38",
    })).toEqual({ eligible: false, reason: "preference_disabled" });
  });

  it("does not deliver twice for the same trigger", () => {
    const history: LifecycleDeliveryRecord[] = [{
      messageId: "return_after_inactivity",
      deliveredAt: "2026-09-16T08:00:00.000Z",
      triggerKey: "return:2026-W38",
    }];
    expect(evaluateLifecycleEligibility({
      rule: returnRule,
      preferences: DEFAULT_LIFECYCLE_PREFERENCES,
      marketingConsent: false,
      history,
      triggerKey: "return:2026-W38",
      now: new Date("2026-09-16T12:00:00.000Z"),
    }).reason).toBe("duplicate_trigger");
  });

  it("applies the rolling frequency cap", () => {
    const history: LifecycleDeliveryRecord[] = [{
      messageId: "return_after_inactivity",
      deliveredAt: "2026-09-14T08:00:00.000Z",
      triggerKey: "return:previous",
    }];
    expect(evaluateLifecycleEligibility({
      rule: returnRule,
      preferences: DEFAULT_LIFECYCLE_PREFERENCES,
      marketingConsent: false,
      history,
      triggerKey: "return:new",
      now: new Date("2026-09-16T12:00:00.000Z"),
    }).reason).toBe("frequency_cap");
  });

  it("requires both preference and consent for marketing rules", () => {
    const marketingRule = { ...returnRule, id: "welcome" as const, preference: "marketing" as const, marketing: true };
    expect(evaluateLifecycleEligibility({
      rule: marketingRule,
      preferences: { ...DEFAULT_LIFECYCLE_PREFERENCES, marketing: true },
      marketingConsent: false,
      history: [],
      triggerKey: "campaign:one",
    }).reason).toBe("marketing_consent_required");
  });

  it("does not suppress transactional messages when product preferences are disabled", () => {
    const paymentRule = LIFECYCLE_RULES.find((rule) => rule.trigger === "payment_confirmed")!;
    expect(evaluateLifecycleEligibility({
      rule: paymentRule,
      preferences: { ...DEFAULT_LIFECYCLE_PREFERENCES, product: false },
      marketingConsent: false,
      history: [],
      triggerKey: "payment:mp-opaque-001",
    })).toEqual({ eligible: true, reason: "eligible" });
  });

  it("defines a single message for payment_confirmed", () => {
    expect(LIFECYCLE_RULES.filter((rule) => rule.trigger === "payment_confirmed")).toHaveLength(1);
    expect(LIFECYCLE_RULES.filter((rule) => rule.transactional).every((rule) => !rule.marketing)).toBe(true);
  });

  it("deduplicates the same trigger across different message ids", () => {
    const history: LifecycleDeliveryRecord[] = [{
      messageId: "payment_pending",
      deliveredAt: "2026-09-16T08:00:00.000Z",
      triggerKey: "payment:mp-opaque-002",
    }];
    const paymentRule = LIFECYCLE_RULES.find((rule) => rule.trigger === "payment_confirmed")!;
    expect(evaluateLifecycleEligibility({
      rule: paymentRule,
      preferences: DEFAULT_LIFECYCLE_PREFERENCES,
      marketingConsent: false,
      history,
      triggerKey: "payment:mp-opaque-002",
      now: new Date("2026-09-16T12:00:00.000Z"),
    }).reason).toBe("duplicate_trigger");
  });

  it("allows a later renewal with a distinct provider trigger", () => {
    const renewalRule = LIFECYCLE_RULES.find((rule) => rule.id === "subscription_renewed")!;
    const history: LifecycleDeliveryRecord[] = [{
      messageId: "subscription_renewed",
      deliveredAt: "2026-08-16T12:00:00.000Z",
      triggerKey: "renewal:invoice-001",
    }];

    expect(evaluateLifecycleEligibility({
      rule: renewalRule,
      preferences: DEFAULT_LIFECYCLE_PREFERENCES,
      marketingConsent: false,
      history,
      triggerKey: "renewal:invoice-002",
      now: new Date("2026-09-16T12:00:00.000Z"),
    })).toEqual({ eligible: true, reason: "eligible" });
  });
});
