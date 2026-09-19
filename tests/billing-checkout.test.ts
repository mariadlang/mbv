import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCheckoutHandler } from "@/app/api/billing/checkout/route";
import {
  buildSubscriptionCheckoutRequest,
  MercadoPagoApiError,
  MercadoPagoClient,
} from "@/src/server/billing/mercadoPagoClient";
import type {
  BillingPersistence,
  CheckoutIntent,
  StaleReadyCheckoutIntent,
} from "@/src/server/billing/repository";

const monthlyInput = {
  interval: "monthly" as const,
  payerEmail: "persona@example.com",
  externalReference: "3c83adfe-7309-4ca9-82d1-cc4673462fc0",
  appBaseUrl: "https://example.com",
};

describe("Mercado Pago checkout request", () => {
  it("derives price, currency and recurrence only from the server catalog", () => {
    expect(buildSubscriptionCheckoutRequest(monthlyInput)).toEqual({
      reason: "My Best Version Premium mensual",
      external_reference: monthlyInput.externalReference,
      payer_email: monthlyInput.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 2.99,
        currency_id: "USD",
      },
      back_url: "https://example.com/upgrade?billing=confirming",
      notification_url: "https://example.com/api/billing/mercado-pago/webhook",
      status: "pending",
    });
    expect(buildSubscriptionCheckoutRequest({ ...monthlyInput, interval: "annual" }).auto_recurring).toEqual({
      frequency: 12,
      frequency_type: "months",
      transaction_amount: 29.99,
      currency_id: "USD",
    });
  });

  it("sends no user id, card data or client-provided amount", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: "preapproval-1",
      status: "pending",
      external_reference: monthlyInput.externalReference,
      init_point: "https://www.mercadopago.com.co/subscriptions/checkout?id=preapproval-1",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 2.99,
        currency_id: "USD",
      },
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const client = new MercadoPagoClient("TEST-token-not-real-123456789", fetchMock);
    await client.createSubscriptionCheckout(monthlyInput);

    const request = fetchMock.mock.calls[0];
    expect(request?.[0]).toBe("https://api.mercadopago.com/preapproval");
    const body = JSON.parse(String(request?.[1]?.body));
    expect(body).not.toHaveProperty("user_id");
    expect(body).not.toHaveProperty("card_token_id");
    expect(body.auto_recurring.transaction_amount).toBe(2.99);
    expect(request?.[1]?.headers).toMatchObject({
      Authorization: "Bearer TEST-token-not-real-123456789",
      "X-Idempotency-Key": monthlyInput.externalReference,
    });
  });

  it("rejects unsafe provider checkout URLs", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: "preapproval-1",
      status: "pending",
      init_point: "https://evil.example/steal",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 2.99,
        currency_id: "USD",
      },
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const client = new MercadoPagoClient("TEST-token-not-real-123456789", fetchMock);
    await expect(client.createSubscriptionCheckout(monthlyInput)).rejects.toThrow("MERCADO_PAGO_INVALID_CHECKOUT_URL");
  });

  it("does not trust a lookalike domain that starts with the provider name", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: "preapproval-1",
      status: "pending",
      external_reference: monthlyInput.externalReference,
      init_point: "https://mercadopago.evil.example/subscriptions/checkout",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 2.99,
        currency_id: "USD",
      },
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const client = new MercadoPagoClient("TEST-token-not-real-123456789", fetchMock);
    await expect(client.createSubscriptionCheckout(monthlyInput)).rejects.toThrow("MERCADO_PAGO_INVALID_CHECKOUT_URL");
  });

  it("classifies a malformed provider response as an upstream failure", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: "preapproval-1",
      status: "pending",
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const client = new MercadoPagoClient("TEST-token-not-real-123456789", fetchMock);
    await expect(client.createSubscriptionCheckout(monthlyInput))
      .rejects.toThrow("MERCADO_PAGO_INVALID_RESPONSE");
  });

  it("cancels a subscription with the provider documented status", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: "preapproval-1",
      status: "canceled",
      external_reference: monthlyInput.externalReference,
      init_point: null,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 2.99,
        currency_id: "USD",
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = new MercadoPagoClient("TEST-token-not-real-123456789", fetchMock);

    await expect(client.cancelSubscription("preapproval-1")).resolves.toMatchObject({
      id: "preapproval-1",
      status: "canceled",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/preapproval/preapproval-1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "canceled" }) }),
    );
  });
});

const userId = "11111111-1111-4111-8111-111111111111";
const staleIntentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nextIntentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const claimToken = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const authClient = {} as SupabaseClient;
const serviceClient = {} as SupabaseClient;
const billingConfig = {
  appBaseUrl: "https://example.com",
  billingMode: "subscription_auto" as const,
  mercadoPagoAccessToken: "TEST-token-not-real-123456789",
  mercadoPagoWebhookSecret: "test-webhook-secret-that-is-long-enough",
  supabaseServiceRoleKey: "test-service-role-key-long-enough",
};

const staleMonthlyIntent: StaleReadyCheckoutIntent = {
  id: staleIntentId,
  user_id: userId,
  plan_interval: "monthly",
  amount_minor: 299,
  currency: "USD",
  status: "ready",
  provider_subscription_id: "preapproval-stale",
  checkout_url: "https://www.mercadopago.com.co/subscriptions/checkout?id=preapproval-stale",
  expires_at: "2026-09-18T12:00:00.000Z",
};

const nextAnnualIntent: CheckoutIntent = {
  id: nextIntentId,
  plan: "annual",
  amount_minor: 2999,
  currency: "USD",
  status: "created",
  provider_subscription_id: null,
  checkout_url: null,
  claim_token: claimToken,
  claim_expires_at: "2026-09-19T12:05:00.000Z",
};

function subscriptionFixture(
  status: string,
  input: { id?: string; intentId?: string; annual?: boolean } = {},
) {
  const annual = input.annual ?? false;
  const id = input.id ?? staleMonthlyIntent.provider_subscription_id;
  return {
    id,
    status,
    external_reference: input.intentId ?? staleIntentId,
    init_point: `https://www.mercadopago.com.co/subscriptions/checkout?id=${id}`,
    last_modified: "2026-09-19T11:00:00.000Z",
    auto_recurring: {
      frequency: annual ? 12 : 1,
      frequency_type: "months",
      transaction_amount: annual ? 29.99 : 2.99,
      currency_id: "USD",
    },
  };
}

function checkoutRequest(interval: "monthly" | "annual") {
  return new NextRequest("https://example.com/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interval }),
  });
}

function checkoutHarness(input: {
  providerSubscription: ReturnType<typeof subscriptionFixture> | Error;
  nextIntent?: CheckoutIntent;
  createdSubscription?: ReturnType<typeof subscriptionFixture>;
}) {
  const getStaleReadyCheckoutIntent = vi.fn().mockResolvedValue(staleMonthlyIntent);
  const closeStaleCheckoutIntent = vi.fn().mockResolvedValue({ intentId: staleIntentId, status: "cancelled" });
  const createCheckoutIntent = vi.fn().mockResolvedValue(input.nextIntent);
  const completeCheckoutIntent = vi.fn().mockResolvedValue(undefined);
  const releaseCheckoutIntent = vi.fn().mockResolvedValue(undefined);
  const persistence = {
    getStaleReadyCheckoutIntent,
    closeStaleCheckoutIntent,
    createCheckoutIntent,
    completeCheckoutIntent,
    releaseCheckoutIntent,
  } as unknown as BillingPersistence;
  const getSubscription = input.providerSubscription instanceof Error
    ? vi.fn().mockRejectedValue(input.providerSubscription)
    : vi.fn().mockResolvedValue(input.providerSubscription);
  const findSubscriptionByExternalReference = vi.fn().mockResolvedValue(null);
  const createSubscriptionCheckout = vi.fn().mockResolvedValue(input.createdSubscription);
  const provider = {
    getSubscription,
    findSubscriptionByExternalReference,
    createSubscriptionCheckout,
  } as unknown as MercadoPagoClient;
  const handler = createCheckoutHandler({
    authenticate: async () => ({ userId, client: authClient, e2e: false }),
    getConfig: () => billingConfig,
    createServiceClient: () => serviceClient,
    createPersistence: () => persistence,
    createProvider: () => provider,
    getPayerEmail: async () => "persona@example.com",
    now: () => new Date("2026-09-19T12:00:00.000Z"),
  });
  return {
    handler,
    getStaleReadyCheckoutIntent,
    closeStaleCheckoutIntent,
    createCheckoutIntent,
    completeCheckoutIntent,
    releaseCheckoutIntent,
    getSubscription,
    findSubscriptionByExternalReference,
    createSubscriptionCheckout,
  };
}

describe("stale provider-backed checkout recovery", () => {
  it("reuses the canonical non-terminal checkout for the same interval", async () => {
    const harness = checkoutHarness({ providerSubscription: subscriptionFixture("pending") });

    const response = await harness.handler(checkoutRequest("monthly"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      interval: "monthly",
      reused: true,
      checkoutUrl: staleMonthlyIntent.checkout_url,
    });
    expect(harness.getSubscription).toHaveBeenCalledWith("preapproval-stale");
    expect(harness.closeStaleCheckoutIntent).not.toHaveBeenCalled();
    expect(harness.createCheckoutIntent).not.toHaveBeenCalled();
  });

  it("does not open an annual checkout while the stale monthly provider state remains non-terminal", async () => {
    const harness = checkoutHarness({ providerSubscription: subscriptionFixture("authorized") });

    const response = await harness.handler(checkoutRequest("annual"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "CHECKOUT_ALREADY_OPEN" });
    expect(harness.closeStaleCheckoutIntent).not.toHaveBeenCalled();
    expect(harness.createCheckoutIntent).not.toHaveBeenCalled();
  });

  it("closes a terminal abandoned monthly checkout before creating the requested annual checkout", async () => {
    const createdSubscription = subscriptionFixture("pending", {
      id: "preapproval-annual",
      intentId: nextIntentId,
      annual: true,
    });
    const harness = checkoutHarness({
      providerSubscription: subscriptionFixture("cancelled"),
      nextIntent: nextAnnualIntent,
      createdSubscription,
    });

    const response = await harness.handler(checkoutRequest("annual"));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      interval: "annual",
      reused: false,
    });
    expect(harness.closeStaleCheckoutIntent).toHaveBeenCalledWith(serviceClient, {
      intentId: staleIntentId,
      providerSubscriptionId: "preapproval-stale",
      providerStatus: "cancelled",
      providerUpdatedAt: "2026-09-19T11:00:00.000Z",
    });
    expect(harness.createCheckoutIntent).toHaveBeenCalledWith(authClient, "annual");
    expect(harness.completeCheckoutIntent).toHaveBeenCalledWith(serviceClient, expect.objectContaining({
      intentId: nextIntentId,
      providerSubscriptionId: "preapproval-annual",
    }));
  });

  it("keeps the old checkout intact when the canonical provider lookup fails temporarily", async () => {
    const harness = checkoutHarness({
      providerSubscription: new MercadoPagoApiError(503, "MERCADO_PAGO_HTTP_503"),
    });

    const response = await harness.handler(checkoutRequest("annual"));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("10");
    await expect(response.json()).resolves.toEqual({ error: "MERCADO_PAGO_HTTP_503" });
    expect(harness.closeStaleCheckoutIntent).not.toHaveBeenCalled();
    expect(harness.createCheckoutIntent).not.toHaveBeenCalled();
    expect(harness.releaseCheckoutIntent).not.toHaveBeenCalled();
  });
});
