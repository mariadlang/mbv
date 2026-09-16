import { describe, expect, it } from "vitest";
import { resolvePremiumGateDescriptionKey } from "./PremiumFeatureGate";

describe("PremiumFeatureGate copy rollout", () => {
  it("preserves the existing five-year copy while the flag is disabled", () => {
    expect(resolvePremiumGateDescriptionKey("five_year_planning", false)).toBe("premium.gate.fiveYear.description");
  });

  it("uses contextual copy only for five-year planning when enabled", () => {
    expect(resolvePremiumGateDescriptionKey("five_year_planning", true)).toBe("premium.gate.fiveYear.contextualDescription");
    expect(resolvePremiumGateDescriptionKey("feed_hub", true)).toBe("premium.gate.feedHub.description");
  });
});
