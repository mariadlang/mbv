export const productFeatureFlagNames = [
  "weekly_recap",
  "return_experience",
  "share_cards",
  "referrals",
  "premium_contextual_prompts",
] as const;

export type ProductFeatureFlagName = typeof productFeatureFlagNames[number];
export type ProductFeatureFlags = Readonly<Record<ProductFeatureFlagName, boolean>>;

export const DEFAULT_PRODUCT_FEATURE_FLAGS: ProductFeatureFlags = Object.freeze({
  weekly_recap: false,
  return_experience: false,
  share_cards: false,
  referrals: false,
  premium_contextual_prompts: false,
});

function enabledFromConfig(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function resolveProductFeatureFlags(
  input: Partial<Record<ProductFeatureFlagName, unknown>> = {},
): ProductFeatureFlags {
  return Object.freeze(Object.fromEntries(
    productFeatureFlagNames.map((flag) => [flag, enabledFromConfig(input[flag])]),
  ) as Record<ProductFeatureFlagName, boolean>);
}

export function isProductFeatureEnabled(flags: ProductFeatureFlags, flag: ProductFeatureFlagName): boolean {
  return flags[flag];
}
