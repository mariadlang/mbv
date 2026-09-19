import { z } from "zod";
import { BILLING_INTERVALS, getPremiumOffer, type BillingInterval } from "@/src/domain/commercialOffer";
import {
  BILLING_CANCELLATION_CONFIRMATION,
  type BillingCancellationResult,
  type BillingCheckoutResult,
  type BillingRepository,
  type BillingStatusResult,
} from "@/src/repositories/interfaces/BillingRepository";

const readyCheckoutSchema = z.object({
  status: z.literal("ready"),
  checkoutUrl: z.string().url(),
  interval: z.enum(BILLING_INTERVALS),
  amountMinor: z.number().int().positive(),
  currency: z.literal("USD"),
  reused: z.boolean(),
});

const creatingCheckoutSchema = z.object({
  status: z.literal("creating"),
  retryAfterSeconds: z.number().int().min(1).max(10),
});

const checkoutErrorSchema = z.object({ error: z.string().min(1).max(100) });

const nullableIsoDate = z.string().datetime({ offset: true }).nullable();
const billingStatusSchema = z.object({
  accessStatus: z.enum([
    "free", "eligible", "pending_activation", "trial_active", "trial_expired",
    "paid_monthly", "paid_annual", "payment_pending", "payment_failed",
    "cancellation_scheduled", "subscription_ended", "legacy_premium", "blocked",
    "trial", "active", "expired",
  ]),
  subscriptionStatus: z.enum(["none", "pending", "active", "past_due", "failed", "cancel_at_period_end", "cancelled", "ended"]),
  interval: z.enum(BILLING_INTERVALS).nullable(),
  premiumSource: z.enum(["promotional_trial", "paid_subscription", "legacy", "superadmin"]).nullable(),
  trialStartedAt: nullableIsoDate,
  trialEndsAt: nullableIsoDate,
  eligibilityStatus: z.enum(["tracking", "eligible", "activated", "conflict_paid_premium"]).nullable(),
  campaignKey: z.string().min(1).max(120).nullable(),
  currentStreakDays: z.number().int().nonnegative(),
  eligibleAt: nullableIsoDate,
  currentPeriodStartsAt: nullableIsoDate,
  currentPeriodEndsAt: nullableIsoDate,
  nextPaymentAt: nullableIsoDate,
  cancelAtPeriodEnd: z.boolean(),
  serverNow: z.string().datetime({ offset: true }),
});

const cancellationResultSchema = z.object({
  status: z.enum(["scheduled", "ended"]),
  accessStatus: billingStatusSchema.shape.accessStatus,
  subscriptionStatus: billingStatusSchema.shape.subscriptionStatus,
  cancelAtPeriodEnd: z.boolean(),
  accessUntil: nullableIsoDate,
  serverNow: z.string().datetime({ offset: true }),
});

const cancellationProcessingSchema = cancellationResultSchema.extend({
  status: z.literal("processing"),
  retryAfterSeconds: z.number().int().min(1).max(10),
});

function isMercadoPagoUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:"
    && !url.port
    && (host === "mercadopago.com.co" || host.endsWith(".mercadopago.com.co"));
}

export class BillingCheckoutError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
    this.name = "BillingCheckoutError";
  }
}

export class MercadoPagoBillingRepository implements BillingRepository {
  async createCheckout(accessToken: string, interval: BillingInterval): Promise<BillingCheckoutResult> {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ interval }),
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorPayload = checkoutErrorSchema.safeParse(body);
      const code = errorPayload.success ? errorPayload.data.error : "CHECKOUT_UNAVAILABLE";
      throw new BillingCheckoutError(response.status, code);
    }
    if (response.status === 202) return creatingCheckoutSchema.parse(body);
    const result = readyCheckoutSchema.parse(body);
    const expected = getPremiumOffer(interval);
    if (
      result.interval !== interval
      || result.amountMinor !== expected.amountMinor
      || result.currency !== expected.currency
      || !isMercadoPagoUrl(result.checkoutUrl)
    ) throw new BillingCheckoutError(502, "CHECKOUT_RESPONSE_MISMATCH");
    return result;
  }

  async getStatus(accessToken: string): Promise<BillingStatusResult> {
    const response = await fetch("/api/billing/status", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorPayload = checkoutErrorSchema.safeParse(body);
      const code = errorPayload.success ? errorPayload.data.error : "BILLING_STATUS_UNAVAILABLE";
      throw new BillingCheckoutError(response.status, code);
    }
    return billingStatusSchema.parse(body);
  }

  async cancelSubscription(accessToken: string): Promise<BillingCancellationResult> {
    const response = await fetch("/api/billing/subscription/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ confirmation: BILLING_CANCELLATION_CONFIRMATION }),
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorPayload = checkoutErrorSchema.safeParse(body);
      const code = errorPayload.success ? errorPayload.data.error : "BILLING_CANCELLATION_UNAVAILABLE";
      throw new BillingCheckoutError(response.status, code);
    }
    return response.status === 202
      ? cancellationProcessingSchema.parse(body)
      : cancellationResultSchema.parse(body);
  }
}
