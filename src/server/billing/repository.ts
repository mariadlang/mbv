import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { BILLING_INTERVALS, type BillingInterval } from "@/src/domain/commercialOffer";
import type { ProviderBillingSnapshot } from "@/src/server/billing/reconciliation";

const checkoutIntentSchema = z.object({
  id: z.string().uuid(),
  plan: z.enum(BILLING_INTERVALS),
  amount_minor: z.number().int().nonnegative(),
  currency: z.string(),
  status: z.string(),
  provider_subscription_id: z.string().nullable(),
  checkout_url: z.string().url().nullable(),
  claim_token: z.string().uuid().nullable(),
  claim_expires_at: z.string().datetime({ offset: true }).nullable(),
});

const providerEventClaimSchema = z.object({
  event_id: z.string().uuid(),
  claimed: z.boolean(),
  processing_status: z.enum(["processing", "processed", "ignored", "failed"]),
});

const commercialPlanSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  role: z.string(),
  access_status: z.string(),
  subscription_status: z.string(),
  trial_started_at: z.string().datetime({ offset: true }).nullable(),
  trial_ends_at: z.string().datetime({ offset: true }).nullable(),
  server_now: z.string().datetime({ offset: true }),
  eligibility_status: z.string().nullable(),
  plan_interval: z.enum(BILLING_INTERVALS).nullable(),
  premium_source: z.string().nullable(),
  campaign_key: z.string().nullable(),
  current_streak_days: z.number().int().nonnegative(),
  eligible_at: z.string().datetime({ offset: true }).nullable(),
  current_period_starts_at: z.string().datetime({ offset: true }).nullable(),
  current_period_ends_at: z.string().datetime({ offset: true }).nullable(),
  next_payment_at: z.string().datetime({ offset: true }).nullable(),
  cancel_at_period_end: z.boolean(),
});

const ownedSubscriptionSchema = z.object({
  id: z.string().uuid(),
  checkout_intent_id: z.string().uuid(),
  provider_subscription_id: z.string().min(1).max(200),
  plan_interval: z.enum(BILLING_INTERVALS),
  status: z.enum(["pending", "active", "past_due", "cancel_at_period_end"]),
  current_period_end: z.string().datetime({ offset: true }).nullable(),
  provider_updated_at: z.string().datetime({ offset: true }),
});

const ownedCheckoutIntentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider_subscription_id: z.string().min(1).max(200),
});

const staleReadyCheckoutIntentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  plan_interval: z.enum(BILLING_INTERVALS),
  amount_minor: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.literal("ready"),
  provider_subscription_id: z.string().min(1).max(200),
  checkout_url: z.string().url(),
  expires_at: z.string().datetime({ offset: true }),
});

const closedCheckoutIntentSchema = z.object({
  intent_id: z.string().uuid(),
  status: z.enum(["cancelled", "expired", "failed"]),
});

export type CheckoutIntent = z.infer<typeof checkoutIntentSchema>;
export type CommercialPlanSnapshot = z.infer<typeof commercialPlanSchema>;
export type OwnedBillingSubscription = z.infer<typeof ownedSubscriptionSchema>;
export type StaleReadyCheckoutIntent = z.infer<typeof staleReadyCheckoutIntentSchema>;

function oneRow<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(Array.isArray(value) ? value[0] : value);
}

export interface BillingPersistence {
  createCheckoutIntent(client: SupabaseClient, interval: BillingInterval): Promise<CheckoutIntent>;
  completeCheckoutIntent(client: SupabaseClient, input: {
    intentId: string;
    claimToken: string;
    providerSubscriptionId: string;
    checkoutUrl: string;
    providerStatus: string;
    providerUpdatedAt: string;
  }): Promise<void>;
  releaseCheckoutIntent(client: SupabaseClient, input: {
    intentId: string;
    claimToken: string;
    errorCode: string;
  }): Promise<void>;
  getStaleReadyCheckoutIntent(
    client: SupabaseClient,
    userId: string,
    checkedAt: string,
  ): Promise<StaleReadyCheckoutIntent | null>;
  closeStaleCheckoutIntent(client: SupabaseClient, input: {
    intentId: string;
    providerSubscriptionId: string;
    providerStatus: string;
    providerUpdatedAt: string;
  }): Promise<{ intentId: string; status: "cancelled" | "expired" | "failed" }>;
  claimProviderEvent(client: SupabaseClient, input: {
    providerEventId: string;
    eventType: string;
    resourceId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  }): Promise<{ eventId: string; claimed: boolean; processingStatus: "processing" | "processed" | "ignored" | "failed" }>;
  failProviderEvent(client: SupabaseClient, input: { eventId: string; errorCode: string }): Promise<void>;
  reconcileBillingEvent(client: SupabaseClient, eventId: string, snapshot: ProviderBillingSnapshot): Promise<void>;
  getOwnedSubscriptionForCancellation(client: SupabaseClient, userId: string): Promise<OwnedBillingSubscription>;
  getMyCommercialPlan(client: SupabaseClient): Promise<CommercialPlanSnapshot>;
  setAdminNotificationEmail(client: SupabaseClient, email: string): Promise<void>;
  runCommercialMaintenance(client: SupabaseClient, now: string): Promise<void>;
}

export class SupabaseBillingPersistence implements BillingPersistence {
  async createCheckoutIntent(client: SupabaseClient, interval: BillingInterval): Promise<CheckoutIntent> {
    const { data, error } = await client.rpc("create_checkout_intent", { next_plan: interval });
    if (error) throw error;
    return oneRow(checkoutIntentSchema, data);
  }

  async completeCheckoutIntent(client: SupabaseClient, input: {
    intentId: string;
    claimToken: string;
    providerSubscriptionId: string;
    checkoutUrl: string;
    providerStatus: string;
    providerUpdatedAt: string;
  }): Promise<void> {
    const { error } = await client.rpc("complete_checkout_intent", {
      p_intent_id: input.intentId,
      p_claim_token: input.claimToken,
      p_provider_subscription_id: input.providerSubscriptionId,
      p_checkout_url: input.checkoutUrl,
      p_provider_status: input.providerStatus,
      p_provider_updated_at: input.providerUpdatedAt,
    });
    if (error) throw error;
  }

  async releaseCheckoutIntent(client: SupabaseClient, input: {
    intentId: string;
    claimToken: string;
    errorCode: string;
  }): Promise<void> {
    const { error } = await client.rpc("release_checkout_intent", {
      p_intent_id: input.intentId,
      p_claim_token: input.claimToken,
      p_error_code: input.errorCode.slice(0, 80),
    });
    if (error) throw error;
  }

  async getStaleReadyCheckoutIntent(
    client: SupabaseClient,
    userId: string,
    checkedAt: string,
  ): Promise<StaleReadyCheckoutIntent | null> {
    const normalizedUserId = z.string().uuid().parse(userId);
    const normalizedCheckedAt = z.string().datetime({ offset: true }).parse(checkedAt);
    const { data, error } = await client
      .from("commercial_checkout_intents")
      .select("id,user_id,plan_interval,amount_minor,currency,status,provider_subscription_id,checkout_url,expires_at")
      .eq("user_id", normalizedUserId)
      .eq("provider", "mercado_pago")
      .eq("status", "ready")
      .lte("expires_at", normalizedCheckedAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const intent = staleReadyCheckoutIntentSchema.parse(data);
    if (intent.user_id !== normalizedUserId) throw new Error("BILLING_CHECKOUT_OWNERSHIP_MISMATCH");
    return intent;
  }

  async closeStaleCheckoutIntent(client: SupabaseClient, input: {
    intentId: string;
    providerSubscriptionId: string;
    providerStatus: string;
    providerUpdatedAt: string;
  }): Promise<{ intentId: string; status: "cancelled" | "expired" | "failed" }> {
    const { data, error } = await client.rpc("close_stale_checkout_intent", {
      p_intent_id: input.intentId,
      p_provider_subscription_id: input.providerSubscriptionId,
      p_provider_status: input.providerStatus,
      p_provider_updated_at: input.providerUpdatedAt,
    });
    if (error) throw error;
    const row = oneRow(closedCheckoutIntentSchema, data);
    return { intentId: row.intent_id, status: row.status };
  }

  async claimProviderEvent(client: SupabaseClient, input: {
    providerEventId: string;
    eventType: string;
    resourceId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  }): Promise<{ eventId: string; claimed: boolean; processingStatus: "processing" | "processed" | "ignored" | "failed" }> {
    const { data, error } = await client.rpc("claim_billing_provider_event", {
      p_provider_event_id: input.providerEventId,
      p_event_type: input.eventType,
      p_resource_id: input.resourceId,
      p_occurred_at: input.occurredAt,
      p_payload: input.payload,
    });
    if (error) throw error;
    const row = oneRow(providerEventClaimSchema, data);
    return { eventId: row.event_id, claimed: row.claimed, processingStatus: row.processing_status };
  }

  async failProviderEvent(client: SupabaseClient, input: { eventId: string; errorCode: string }): Promise<void> {
    const { error } = await client.rpc("fail_billing_provider_event", {
      p_event_id: input.eventId,
      p_error_code: input.errorCode,
    });
    if (error) throw error;
  }

  async reconcileBillingEvent(client: SupabaseClient, eventId: string, snapshot: ProviderBillingSnapshot): Promise<void> {
    const { error } = await client.rpc("reconcile_billing_event", {
      p_event_id: eventId,
      p_provider_subscription_id: snapshot.providerSubscriptionId,
      p_external_reference: snapshot.externalReference,
      p_provider_payment_id: snapshot.providerPaymentId,
      p_subscription_status: snapshot.subscriptionStatus,
      p_payment_status: snapshot.paymentStatus,
      p_status_detail: snapshot.statusDetail,
      p_amount_minor: snapshot.amountMinor,
      p_currency: snapshot.currency,
      p_period_start: snapshot.periodStart,
      p_period_end: snapshot.periodEnd,
      p_next_payment_at: snapshot.nextPaymentAt,
      p_provider_updated_at: snapshot.providerUpdatedAt,
      p_payload: {
        event_type: snapshot.eventType,
        resource_id: snapshot.resourceId,
      },
    });
    if (error) throw error;
  }

  async getOwnedSubscriptionForCancellation(
    client: SupabaseClient,
    userId: string,
  ): Promise<OwnedBillingSubscription> {
    const normalizedUserId = z.string().uuid().parse(userId);
    const { data, error } = await client
      .from("billing_subscriptions")
      .select("id,checkout_intent_id,provider_subscription_id,plan_interval,status,current_period_end,provider_updated_at")
      .eq("user_id", normalizedUserId)
      .eq("provider", "mercado_pago")
      .in("status", ["pending", "active", "past_due", "cancel_at_period_end"])
      .order("provider_updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("BILLING_SUBSCRIPTION_NOT_FOUND");
    const subscription = ownedSubscriptionSchema.parse(data);

    // Service-role access bypasses RLS, so ownership is deliberately checked
    // again against the checkout that originally created this provider ID.
    const { data: intentData, error: intentError } = await client
      .from("commercial_checkout_intents")
      .select("id,user_id,provider_subscription_id")
      .eq("id", subscription.checkout_intent_id)
      .eq("user_id", normalizedUserId)
      .eq("provider", "mercado_pago")
      .maybeSingle();
    if (intentError) throw intentError;
    if (!intentData) throw new Error("BILLING_SUBSCRIPTION_OWNERSHIP_MISMATCH");
    const intent = ownedCheckoutIntentSchema.parse(intentData);
    if (intent.provider_subscription_id !== subscription.provider_subscription_id) {
      throw new Error("BILLING_SUBSCRIPTION_OWNERSHIP_MISMATCH");
    }
    return subscription;
  }

  async getMyCommercialPlan(client: SupabaseClient): Promise<CommercialPlanSnapshot> {
    const { data, error } = await client.rpc("get_my_commercial_plan");
    if (error) throw error;
    return oneRow(commercialPlanSchema, data);
  }

  async setAdminNotificationEmail(client: SupabaseClient, email: string): Promise<void> {
    const { error } = await client.rpc("set_admin_notification_email", { p_email: email });
    if (error) throw error;
  }

  async runCommercialMaintenance(client: SupabaseClient, now: string): Promise<void> {
    const { error } = await client.rpc("run_commercial_maintenance", { p_now: now });
    if (error) throw error;
  }
}
