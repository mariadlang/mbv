export const BILLING_INTERVALS = ["monthly", "annual"] as const;

export type BillingInterval = typeof BILLING_INTERVALS[number];

export const FREE_FEATURES = [
  "vision",
  "goals",
  "habits",
  "daily_plan",
  "dashboard",
] as const;

export const PREMIUM_FEATURES = [
  "fitness_and_nutrition",
  "finance",
  "advanced_progress_analysis",
  "personalized_recommendations",
] as const;

export type FreeCommercialFeature = typeof FREE_FEATURES[number];
export type PremiumCommercialFeature = typeof PREMIUM_FEATURES[number];
export type CommercialFeature = FreeCommercialFeature | PremiumCommercialFeature;

export interface PremiumOffer {
  readonly id: `premium_${BillingInterval}`;
  readonly interval: BillingInterval;
  readonly amountMinor: number;
  readonly currency: "USD";
  readonly frequency: number;
  readonly frequencyType: "months";
  readonly features: readonly CommercialFeature[];
}

const ALL_PREMIUM_FEATURES = Object.freeze([
  ...FREE_FEATURES,
  ...PREMIUM_FEATURES,
] satisfies readonly CommercialFeature[]);

export const PREMIUM_OFFERS: Readonly<Record<BillingInterval, PremiumOffer>> = Object.freeze({
  monthly: Object.freeze({
    id: "premium_monthly",
    interval: "monthly",
    amountMinor: 299,
    currency: "USD",
    frequency: 1,
    frequencyType: "months",
    features: ALL_PREMIUM_FEATURES,
  }),
  annual: Object.freeze({
    id: "premium_annual",
    interval: "annual",
    amountMinor: 2_999,
    currency: "USD",
    frequency: 12,
    frequencyType: "months",
    features: ALL_PREMIUM_FEATURES,
  }),
});

export function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === "string" && BILLING_INTERVALS.includes(value as BillingInterval);
}

export function getPremiumOffer(interval: BillingInterval): PremiumOffer {
  return PREMIUM_OFFERS[interval];
}

/**
 * Converts integer cents to a canonical decimal string without doing monetary
 * arithmetic with binary floating point. Mercado Pago expects major units at
 * its HTTP boundary, while application and database contracts keep integers.
 */
export function minorUnitsToDecimal(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError("INVALID_MINOR_AMOUNT");
  }
  const whole = Math.floor(amountMinor / 100);
  const fraction = String(amountMinor % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function formatOfferPrice(interval: BillingInterval, locale = "es-CO"): string {
  const offer = getPremiumOffer(interval);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: offer.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(minorUnitsToDecimal(offer.amountMinor)));
}
