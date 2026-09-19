import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/publicConfig", () => ({
  publicConfig: { supabaseUrl: "https://project.supabase.co" },
}));

import { getBillingServerConfig } from "@/src/server/billing/config";

function configureRequiredEnvironment(): void {
  vi.stubEnv("APP_BASE_URL", "https://app.example.com");
  vi.stubEnv("MERCADO_PAGO_ACCESS_TOKEN", "TEST-token-not-real-123456789");
  vi.stubEnv("MERCADO_PAGO_WEBHOOK_SECRET", "webhook_secret_with_at_least_32_chars");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-not-real-123456789");
}

describe("billing server configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("stays disabled until the subscription modality is explicitly selected", () => {
    configureRequiredEnvironment();
    expect(getBillingServerConfig()).toBeNull();

    vi.stubEnv("MERCADO_PAGO_BILLING_MODE", "manual_link");
    expect(getBillingServerConfig()).toBeNull();
  });

  it("enables auto-recurring checkout only for the explicit subscription mode", () => {
    configureRequiredEnvironment();
    vi.stubEnv("MERCADO_PAGO_BILLING_MODE", "subscription_auto");
    expect(getBillingServerConfig()).toMatchObject({
      appBaseUrl: "https://app.example.com",
      billingMode: "subscription_auto",
    });
  });
});
