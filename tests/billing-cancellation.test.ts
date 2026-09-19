import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createCancelSubscriptionHandler } from "@/app/api/billing/subscription/cancel/route";
import type { MercadoPagoClient, MercadoPagoSubscription } from "@/src/server/billing/mercadoPagoClient";
import {
  SupabaseBillingPersistence,
  type BillingPersistence,
  type CommercialPlanSnapshot,
  type OwnedBillingSubscription,
} from "@/src/server/billing/repository";

const userId = "7f871b9e-c704-4ef4-8763-a971b1023bdb";
const intentId = "3c83adfe-7309-4ca9-82d1-cc4673462fc0";
const eventId = "3f8fc209-82a7-4823-a98a-e5b0a05ef6d6";

const activeSubscription: OwnedBillingSubscription = {
  id: "01d88331-6852-469b-984a-a2266661a57d",
  checkout_intent_id: intentId,
  provider_subscription_id: "preapproval-1",
  plan_interval: "monthly",
  status: "active",
  current_period_end: "2026-10-19T12:00:00.000Z",
  provider_updated_at: "2026-09-19T12:00:00.000Z",
};

const scheduledPlan: CommercialPlanSnapshot = {
  user_id: userId,
  email: "persona@example.com",
  display_name: "Persona",
  role: "user",
  access_status: "cancellation_scheduled",
  subscription_status: "cancel_at_period_end",
  trial_started_at: null,
  trial_ends_at: null,
  server_now: "2026-09-19T12:05:00.000Z",
  eligibility_status: "tracking",
  plan_interval: "monthly",
  premium_source: "paid_subscription",
  campaign_key: "consistency-30-v1",
  current_streak_days: 6,
  eligible_at: null,
  current_period_starts_at: "2026-09-19T12:00:00.000Z",
  current_period_ends_at: "2026-10-19T12:00:00.000Z",
  next_payment_at: null,
  cancel_at_period_end: true,
};

function providerSubscription(status: string, externalReference = intentId): MercadoPagoSubscription {
  return {
    id: "preapproval-1",
    status,
    external_reference: externalReference,
    init_point: null,
    payer_id: null,
    next_payment_date: "2026-10-19T12:00:00.000Z",
    date_created: "2026-09-19T12:00:00.000Z",
    last_modified: "2026-09-19T12:04:00.000Z",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 2.99,
      currency_id: "USD",
      start_date: "2026-09-19T12:00:00.000Z",
      end_date: null,
    },
  };
}

function persistenceMock(overrides: Partial<Record<keyof BillingPersistence, unknown>> = {}) {
  return {
    createCheckoutIntent: vi.fn(),
    completeCheckoutIntent: vi.fn(),
    releaseCheckoutIntent: vi.fn(),
    claimProviderEvent: vi.fn().mockResolvedValue({
      eventId,
      claimed: true,
      processingStatus: "processing",
    }),
    failProviderEvent: vi.fn().mockResolvedValue(undefined),
    reconcileBillingEvent: vi.fn().mockResolvedValue(undefined),
    getOwnedSubscriptionForCancellation: vi.fn().mockResolvedValue(activeSubscription),
    getMyCommercialPlan: vi.fn().mockResolvedValue(scheduledPlan),
    setAdminNotificationEmail: vi.fn(),
    runCommercialMaintenance: vi.fn(),
    ...overrides,
  } as unknown as BillingPersistence;
}

function cancelRequest(body: unknown = { confirmation: "CANCELAR_RENOVACION" }) {
  return new NextRequest("https://example.com/api/billing/subscription/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: JSON.stringify(body),
  });
}

function handlerWith(persistence: BillingPersistence, provider: MercadoPagoClient) {
  return createCancelSubscriptionHandler({
    authenticate: vi.fn().mockResolvedValue({ userId, client: {} as SupabaseClient, e2e: false }),
    getConfig: () => ({
      appBaseUrl: "https://example.com",
      billingMode: "subscription_auto",
      mercadoPagoAccessToken: "TEST-token-not-real-123456789",
      mercadoPagoWebhookSecret: "test-secret-that-is-longer-than-32-characters",
      supabaseServiceRoleKey: "test-service-role-key-long-enough",
    }),
    createServiceClient: () => ({} as SupabaseClient),
    createPersistence: () => persistence,
    createProvider: () => provider,
    now: () => new Date("2026-09-19T12:05:00.000Z"),
  });
}

describe("authenticated subscription cancellation API", () => {
  it("validates ownership, cancels once and reconciles the canonical provider state", async () => {
    const persistence = persistenceMock();
    const provider = {
      getSubscription: vi.fn()
        .mockResolvedValueOnce(providerSubscription("authorized"))
        .mockResolvedValueOnce(providerSubscription("canceled")),
      cancelSubscription: vi.fn().mockResolvedValue(providerSubscription("canceled")),
    } as unknown as MercadoPagoClient;

    const response = await handlerWith(persistence, provider)(cancelRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "scheduled",
      subscriptionStatus: "cancel_at_period_end",
      accessUntil: "2026-10-19T12:00:00.000Z",
    });
    expect(persistence.getOwnedSubscriptionForCancellation).toHaveBeenCalledWith(expect.anything(), userId);
    expect(provider.cancelSubscription).toHaveBeenCalledOnce();
    expect(persistence.reconcileBillingEvent).toHaveBeenCalledWith(
      expect.anything(),
      eventId,
      expect.objectContaining({
        providerSubscriptionId: "preapproval-1",
        externalReference: intentId,
        subscriptionStatus: "canceled",
      }),
    );
  });

  it("is idempotent after cancellation is already scheduled locally", async () => {
    const persistence = persistenceMock({
      getOwnedSubscriptionForCancellation: vi.fn().mockResolvedValue({
        ...activeSubscription,
        status: "cancel_at_period_end",
      }),
    });
    const provider = {
      getSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
    } as unknown as MercadoPagoClient;

    const response = await handlerWith(persistence, provider)(cancelRequest());

    expect(response.status).toBe(200);
    expect(persistence.claimProviderEvent).not.toHaveBeenCalled();
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });

  it("reconciles without a second PUT when Mercado Pago is already canceled", async () => {
    const persistence = persistenceMock();
    const provider = {
      getSubscription: vi.fn()
        .mockResolvedValueOnce(providerSubscription("canceled"))
        .mockResolvedValueOnce(providerSubscription("canceled")),
      cancelSubscription: vi.fn(),
    } as unknown as MercadoPagoClient;

    const response = await handlerWith(persistence, provider)(cancelRequest());

    expect(response.status).toBe(200);
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
    expect(persistence.reconcileBillingEvent).toHaveBeenCalledOnce();
  });

  it("stops before mutation when the canonical provider reference is not owned", async () => {
    const persistence = persistenceMock();
    const provider = {
      getSubscription: vi.fn().mockResolvedValue(providerSubscription("authorized", "another-checkout")),
      cancelSubscription: vi.fn(),
    } as unknown as MercadoPagoClient;

    const response = await handlerWith(persistence, provider)(cancelRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "BILLING_SUBSCRIPTION_REFERENCE_MISMATCH" });
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
    expect(persistence.reconcileBillingEvent).not.toHaveBeenCalled();
    expect(persistence.failProviderEvent).toHaveBeenCalledWith(expect.anything(), {
      eventId,
      errorCode: "BILLING_SUBSCRIPTION_REFERENCE_MISMATCH",
    });
  });

  it("rejects a cancellation without the explicit confirmation contract", async () => {
    const persistence = persistenceMock();
    const provider = { getSubscription: vi.fn(), cancelSubscription: vi.fn() } as unknown as MercadoPagoClient;

    const response = await handlerWith(persistence, provider)(cancelRequest({ confirmation: "yes" }));

    expect(response.status).toBe(400);
    expect(persistence.getOwnedSubscriptionForCancellation).not.toHaveBeenCalled();
  });
});

describe("cancellation ownership repository", () => {
  it("filters both subscription and checkout by the authenticated user", async () => {
    const subscriptionBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq", "in", "order", "limit"]) {
      subscriptionBuilder[method] = vi.fn(() => subscriptionBuilder);
    }
    subscriptionBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: {
      ...activeSubscription,
    }, error: null });

    const intentBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq"]) intentBuilder[method] = vi.fn(() => intentBuilder);
    intentBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: {
      id: intentId,
      user_id: userId,
      provider_subscription_id: "preapproval-1",
    }, error: null });

    const client = {
      from: vi.fn((table: string) => table === "billing_subscriptions" ? subscriptionBuilder : intentBuilder),
    } as unknown as SupabaseClient;

    await expect(new SupabaseBillingPersistence().getOwnedSubscriptionForCancellation(client, userId))
      .resolves.toMatchObject({ provider_subscription_id: "preapproval-1" });
    expect(subscriptionBuilder.eq).toHaveBeenCalledWith("user_id", userId);
    expect(subscriptionBuilder.eq).toHaveBeenCalledWith("provider", "mercado_pago");
    expect(intentBuilder.eq).toHaveBeenCalledWith("user_id", userId);
    expect(intentBuilder.eq).toHaveBeenCalledWith("provider", "mercado_pago");
  });
});
