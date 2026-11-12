import { defineConfig, devices } from "@playwright/test";

// Start a separately compiled normal app with NEXT_PUBLIC_MBV_E2E_ACCESS=0 first.
// No webServer reuse from playwright.config.ts: that server enables the E2E account.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /public-main-landmarks\.normal\.ts/,
  use: {
    baseURL: process.env.MBV_PUBLIC_BASE_URL || "http://127.0.0.1:3116",
    timezoneId: "America/Bogota",
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1448, height: 1086 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
  ],
});
