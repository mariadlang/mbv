import { afterEach, describe, expect, it, vi } from "vitest";
import { BillingCheckoutError, MercadoPagoBillingRepository } from "./MercadoPagoBillingRepository";

describe("MercadoPagoBillingRepository", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only the selected interval and accepts the server catalog", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "ready",
      checkoutUrl: "https://www.mercadopago.com.co/subscriptions/checkout",
      interval: "annual",
      amountMinor: 2999,
      currency: "USD",
      reused: false,
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new MercadoPagoBillingRepository().createCheckout("token", "annual")).resolves.toMatchObject({
      status: "ready", interval: "annual", amountMinor: 2999,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/checkout", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ interval: "annual" }),
    }));
  });

  it("rejects a mismatched amount or a checkout URL outside Mercado Pago", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "ready",
      checkoutUrl: "https://example.com/checkout",
      interval: "monthly",
      amountMinor: 300,
      currency: "USD",
      reused: false,
    }), { status: 201, headers: { "Content-Type": "application/json" } })));

    await expect(new MercadoPagoBillingRepository().createCheckout("token", "monthly"))
      .rejects.toMatchObject({ name: "BillingCheckoutError", code: "CHECKOUT_RESPONSE_MISMATCH" });
  });

  it("surfaces disabled server configuration without falling back to a public payment link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "BILLING_NOT_CONFIGURED" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    )));

    const request = new MercadoPagoBillingRepository().createCheckout("token", "monthly");
    await expect(request).rejects.toBeInstanceOf(BillingCheckoutError);
    await expect(request).rejects.toMatchObject({ status: 503, code: "BILLING_NOT_CONFIGURED" });
  });

  it("reads the authenticated server status without trusting a return URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accessStatus: "payment_pending",
      subscriptionStatus: "pending",
      interval: "monthly",
      premiumSource: null,
      trialStartedAt: null,
      trialEndsAt: null,
      eligibilityStatus: "tracking",
      campaignKey: "consistency-30-v1",
      currentStreakDays: 4,
      eligibleAt: null,
      currentPeriodStartsAt: null,
      currentPeriodEndsAt: null,
      nextPaymentAt: null,
      cancelAtPeriodEnd: false,
      serverNow: "2026-09-19T12:00:00.000Z",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new MercadoPagoBillingRepository().getStatus("token")).resolves.toMatchObject({
      accessStatus: "payment_pending",
      subscriptionStatus: "pending",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/status", expect.objectContaining({
      method: "GET",
      headers: { Authorization: "Bearer token" },
      cache: "no-store",
    }));
  });

  it("requests an authenticated cancellation with the fixed confirmation contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "scheduled",
      accessStatus: "cancellation_scheduled",
      subscriptionStatus: "cancel_at_period_end",
      cancelAtPeriodEnd: true,
      accessUntil: "2026-10-19T12:00:00.000Z",
      serverNow: "2026-09-19T12:00:00.000Z",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new MercadoPagoBillingRepository().cancelSubscription("secret-token")).resolves.toMatchObject({
      status: "scheduled",
      cancelAtPeriodEnd: true,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/subscription/cancel", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer secret-token" },
      body: JSON.stringify({ confirmation: "CANCELAR_RENOVACION" }),
    }));
  });

  it("parses a serialized cancellation already being processed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "processing",
      accessStatus: "paid_monthly",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
      accessUntil: "2026-10-19T12:00:00.000Z",
      serverNow: "2026-09-19T12:00:00.000Z",
      retryAfterSeconds: 2,
    }), { status: 202, headers: { "Content-Type": "application/json" } })));

    await expect(new MercadoPagoBillingRepository().cancelSubscription("token")).resolves.toMatchObject({
      status: "processing",
      retryAfterSeconds: 2,
    });
  });
});
