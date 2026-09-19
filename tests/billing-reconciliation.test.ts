import { describe, expect, it, vi } from "vitest";
import type { MercadoPagoClient } from "@/src/server/billing/mercadoPagoClient";
import {
  decideBillingReconciliation,
  loadProviderBillingSnapshot,
  providerAmountToMinor,
  type ProviderBillingSnapshot,
} from "@/src/server/billing/reconciliation";

const approvedSnapshot: ProviderBillingSnapshot = {
  eventType: "subscription_authorized_payment",
  resourceId: "invoice-1",
  providerSubscriptionId: "subscription-1",
  externalReference: "3c83adfe-7309-4ca9-82d1-cc4673462fc0",
  providerPaymentId: "payment-1",
  subscriptionStatus: "authorized",
  paymentStatus: "approved",
  statusDetail: "accredited",
  amountMinor: 299,
  currency: "USD",
  periodStart: "2026-09-19T00:00:00.000Z",
  periodEnd: "2026-10-19T00:00:00.000Z",
  nextPaymentAt: "2026-10-19T00:00:00.000Z",
  providerUpdatedAt: "2026-09-19T00:01:00.000Z",
};

const emptyState = { processedPaymentIds: [], resourceUpdatedAt: {} };

describe("billing reconciliation", () => {
  it("parses provider decimal amounts without floating-point arithmetic", () => {
    expect(providerAmountToMinor("2.99")).toBe(299);
    expect(providerAmountToMinor(29.99)).toBe(2_999);
    expect(providerAmountToMinor("2.999")).toBeNull();
    expect(providerAmountToMinor("-1.00")).toBeNull();
  });

  it("grants paid access only for an approved matching payment with a period end", () => {
    expect(decideBillingReconciliation(emptyState, approvedSnapshot, "monthly")).toEqual({
      action: "apply",
      reason: "current",
      grantPaidAccess: true,
      revokePaidAccess: false,
    });
    expect(decideBillingReconciliation(emptyState, {
      ...approvedSnapshot,
      eventType: "subscription_preapproval",
      resourceId: "subscription-1",
      providerPaymentId: null,
      paymentStatus: null,
    }, "monthly").grantPaidAccess).toBe(false);
  });

  it("routes mismatched price or currency to review", () => {
    expect(decideBillingReconciliation(emptyState, { ...approvedSnapshot, amountMinor: 199 }, "monthly")).toMatchObject({
      action: "review",
      reason: "catalog_mismatch",
      grantPaidAccess: false,
    });
    expect(decideBillingReconciliation(emptyState, { ...approvedSnapshot, currency: "COP" }, "monthly")).toMatchObject({
      action: "review",
      reason: "catalog_mismatch",
    });
  });

  it("ignores duplicate payments and stale versions of the same resource", () => {
    expect(decideBillingReconciliation({
      processedPaymentIds: ["payment-1"],
      resourceUpdatedAt: {},
    }, approvedSnapshot, "monthly")).toMatchObject({ action: "ignore", reason: "duplicate_payment" });
    expect(decideBillingReconciliation({
      processedPaymentIds: [],
      resourceUpdatedAt: {
        "subscription_authorized_payment:invoice-1": "2026-09-20T00:00:00.000Z",
      },
    }, approvedSnapshot, "monthly")).toMatchObject({ action: "ignore", reason: "stale_resource" });
  });

  it("does not revoke a paid period on failures or cancellation notifications", () => {
    const failed = decideBillingReconciliation(emptyState, {
      ...approvedSnapshot,
      providerPaymentId: "payment-2",
      paymentStatus: "rejected",
      subscriptionStatus: "cancelled",
    }, "monthly");
    expect(failed).toMatchObject({ action: "apply", grantPaidAccess: false, revokePaidAccess: false });
  });

  it("keeps the provider paid-through boundary on a subscription cancellation", async () => {
    const client = {
      getSubscription: vi.fn().mockResolvedValue({
        id: "subscription-1",
        status: "cancelled",
        external_reference: "3c83adfe-7309-4ca9-82d1-cc4673462fc0",
        next_payment_date: "2026-10-19T00:00:00.000Z",
        last_modified: "2026-09-20T00:00:00.000Z",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 2.99,
          currency_id: "USD",
          start_date: "2026-09-19T00:00:00.000Z",
        },
      }),
    } as unknown as MercadoPagoClient;

    await expect(loadProviderBillingSnapshot(
      client,
      "subscription_preapproval",
      "subscription-1",
    )).resolves.toMatchObject({
      subscriptionStatus: "cancelled",
      periodEnd: "2026-10-19T00:00:00.000Z",
    });
  });

  it.each([
    ["fin de mes bisiesto", "2028-01-31T15:00:00.000Z", "2028-02-29T15:00:00.000Z"],
    ["ciclo anual que cruza un año bisiesto", "2027-02-28T15:00:00.000Z", "2028-02-28T15:00:00.000Z"],
  ])("preserves the provider calendar for %s instead of adding fixed days", async (_label, startDate, nextPaymentDate) => {
    const client = {
      getSubscription: vi.fn().mockResolvedValue({
        id: "subscription-1",
        status: "authorized",
        external_reference: "3c83adfe-7309-4ca9-82d1-cc4673462fc0",
        next_payment_date: nextPaymentDate,
        last_modified: startDate,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 2.99,
          currency_id: "USD",
          start_date: startDate,
        },
      }),
    } as unknown as MercadoPagoClient;

    await expect(loadProviderBillingSnapshot(
      client,
      "subscription_preapproval",
      "subscription-1",
    )).resolves.toMatchObject({
      periodStart: startDate,
      periodEnd: nextPaymentDate,
      nextPaymentAt: nextPaymentDate,
    });
  });
});
