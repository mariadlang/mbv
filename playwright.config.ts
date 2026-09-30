import { defineConfig, devices } from "@playwright/test";

const capturePublicProduct = process.env.MBV_CAPTURE_LANDING_PRODUCT === "1";
const p2FeatureFlag = capturePublicProduct ? "0" : "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: capturePublicProduct ? /landing-product-captures\.spec\.ts/ : undefined,
  workers: capturePublicProduct ? 1 : undefined,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    ...(capturePublicProduct ? { timezoneId: "America/Bogota" } : {}),
  },
  webServer: {
    command: "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI && !capturePublicProduct,
    env: {
      NEXT_PUBLIC_MBV_E2E_ACCESS: "1",
      NEXT_PUBLIC_FEATURE_WEEKLY_RECAP: p2FeatureFlag,
      NEXT_PUBLIC_FEATURE_RETURN_EXPERIENCE: p2FeatureFlag,
      NEXT_PUBLIC_FEATURE_SHARE_CARDS: p2FeatureFlag,
      NEXT_PUBLIC_FEATURE_REFERRALS: p2FeatureFlag,
      NEXT_PUBLIC_FEATURE_PREMIUM_CONTEXTUAL_PROMPTS: p2FeatureFlag,
      NEXT_PUBLIC_FEATURE_LAUNCH_INVITATION: "1",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(capturePublicProduct ? { deviceScaleFactor: 2 } : {}) } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
