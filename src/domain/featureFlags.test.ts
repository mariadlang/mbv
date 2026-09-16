import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_FEATURE_FLAGS,
  isProductFeatureEnabled,
  productFeatureFlagNames,
  resolveProductFeatureFlags,
} from "./featureFlags";

describe("product feature flags", () => {
  it("keeps every P2 flag disabled by default", () => {
    expect(productFeatureFlagNames).toEqual([
      "weekly_recap",
      "return_experience",
      "share_cards",
      "referrals",
      "premium_contextual_prompts",
    ]);
    expect(resolveProductFeatureFlags()).toEqual(DEFAULT_PRODUCT_FEATURE_FLAGS);
    expect(Object.values(DEFAULT_PRODUCT_FEATURE_FLAGS).every((enabled) => !enabled)).toBe(true);
  });

  it("only enables explicit boolean or canonical environment values", () => {
    const flags = resolveProductFeatureFlags({
      weekly_recap: "1",
      return_experience: "true",
      share_cards: true,
      referrals: "yes",
      premium_contextual_prompts: "1",
    });

    expect(flags).toEqual({
      weekly_recap: true,
      return_experience: true,
      share_cards: true,
      referrals: false,
      premium_contextual_prompts: true,
    });
    expect(isProductFeatureEnabled(flags, "weekly_recap")).toBe(true);
    expect(isProductFeatureEnabled(flags, "premium_contextual_prompts")).toBe(true);
  });
});
