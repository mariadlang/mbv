import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: {
    command: "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_MBV_E2E_ACCESS: "1",
      NEXT_PUBLIC_FEATURE_WEEKLY_RECAP: "1",
      NEXT_PUBLIC_FEATURE_RETURN_EXPERIENCE: "1",
      NEXT_PUBLIC_FEATURE_SHARE_CARDS: "1",
      NEXT_PUBLIC_FEATURE_REFERRALS: "1",
      NEXT_PUBLIC_FEATURE_PREMIUM_CONTEXTUAL_PROMPTS: "1",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
