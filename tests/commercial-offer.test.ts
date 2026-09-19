import { describe, expect, it } from "vitest";
import {
  FREE_FEATURES,
  PREMIUM_FEATURES,
  formatOfferPrice,
  getPremiumOffer,
  isBillingInterval,
  minorUnitsToDecimal,
} from "@/src/domain/commercialOffer";

describe("commercial offer", () => {
  it("keeps USD prices in integer minor units", () => {
    expect(getPremiumOffer("monthly")).toMatchObject({
      amountMinor: 299,
      currency: "USD",
      frequency: 1,
      frequencyType: "months",
    });
    expect(getPremiumOffer("annual")).toMatchObject({
      amountMinor: 2_999,
      currency: "USD",
      frequency: 12,
      frequencyType: "months",
    });
    expect(minorUnitsToDecimal(299)).toBe("2.99");
    expect(minorUnitsToDecimal(2_999)).toBe("29.99");
  });

  it("offers exactly the same Premium features in both intervals", () => {
    const expected = [...FREE_FEATURES, ...PREMIUM_FEATURES];
    expect(getPremiumOffer("monthly").features).toEqual(expected);
    expect(getPremiumOffer("annual").features).toEqual(expected);
  });

  it("accepts only supported billing intervals", () => {
    expect(isBillingInterval("monthly")).toBe(true);
    expect(isBillingInterval("annual")).toBe(true);
    expect(isBillingInterval("yearly")).toBe(false);
    expect(isBillingInterval(12)).toBe(false);
  });

  it("formats the shared offer without changing its cents", () => {
    expect(formatOfferPrice("monthly", "en-US")).toBe("$2.99");
    expect(formatOfferPrice("annual", "en-US")).toBe("$29.99");
  });

  it("rejects unsafe or negative minor-unit amounts", () => {
    expect(() => minorUnitsToDecimal(-1)).toThrow("INVALID_MINOR_AMOUNT");
    expect(() => minorUnitsToDecimal(2.5)).toThrow("INVALID_MINOR_AMOUNT");
  });
});
