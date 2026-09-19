import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { authenticateRequest, type ServerAuthContext } from "@/src/lib/serverAuth";
import {
  createBillingServiceClient,
  requireBillingServerConfig,
  type BillingServerConfig,
} from "@/src/server/billing/config";
import { billingErrorResponse } from "@/src/server/billing/http";
import { MercadoPagoClient } from "@/src/server/billing/mercadoPagoClient";
import { loadProviderBillingSnapshot } from "@/src/server/billing/reconciliation";
import {
  SupabaseBillingPersistence,
  type BillingPersistence,
  type CommercialPlanSnapshot,
} from "@/src/server/billing/repository";

const cancellationRequestSchema = z.object({
  confirmation: z.literal("CANCELAR_RENOVACION"),
}).strict();

type CancellationState = "scheduled" | "ended" | "processing";

interface CancellationRouteDependencies {
  authenticate(request: NextRequest): Promise<ServerAuthContext>;
  getConfig(): BillingServerConfig;
  createServiceClient(config: BillingServerConfig): SupabaseClient;
  createPersistence(): BillingPersistence;
  createProvider(accessToken: string): MercadoPagoClient;
  now(): Date;
}

const productionDependencies: CancellationRouteDependencies = {
  authenticate: authenticateRequest,
  getConfig: requireBillingServerConfig,
  createServiceClient: createBillingServiceClient,
  createPersistence: () => new SupabaseBillingPersistence(),
  createProvider: (accessToken) => new MercadoPagoClient(accessToken),
  now: () => new Date(),
};

function cancellationState(plan: CommercialPlanSnapshot): CancellationState {
  if (plan.cancel_at_period_end || plan.subscription_status === "cancel_at_period_end") return "scheduled";
  if (["cancelled", "ended"].includes(plan.subscription_status)) return "ended";
  return "processing";
}

function planResponse(plan: CommercialPlanSnapshot) {
  return {
    status: cancellationState(plan),
    accessStatus: plan.access_status,
    subscriptionStatus: plan.subscription_status,
    cancelAtPeriodEnd: plan.cancel_at_period_end,
    accessUntil: plan.current_period_ends_at,
    serverNow: plan.server_now,
  };
}

function eventKey(providerSubscriptionId: string): string {
  const digest = createHash("sha256").update(providerSubscriptionId).digest("hex");
  return `self-service-cancel:${digest}`;
}

function providerCancellationFinal(status: string): boolean {
  return ["canceled", "cancelled", "ended", "terminated"].includes(status.trim().toLowerCase());
}

function assertProviderOwnership(
  subscription: Awaited<ReturnType<MercadoPagoClient["getSubscription"]>>,
  providerSubscriptionId: string,
  checkoutIntentId: string,
) {
  if (
    subscription.id !== providerSubscriptionId
    || subscription.external_reference !== checkoutIntentId
  ) throw new Error("BILLING_SUBSCRIPTION_REFERENCE_MISMATCH");
}

export function createCancelSubscriptionHandler(
  overrides: Partial<CancellationRouteDependencies> = {},
) {
  const dependencies = { ...productionDependencies, ...overrides };
  return async function cancelSubscription(request: NextRequest) {
    let claimedEventId: string | null = null;
    let persistence: BillingPersistence | null = null;
    let service: SupabaseClient | null = null;
    try {
      const auth = await dependencies.authenticate(request);
      if (auth.e2e || !auth.client) throw new Response("BILLING_NOT_CONFIGURED", { status: 503 });
      cancellationRequestSchema.parse(await request.json().catch(() => null));
      const config = dependencies.getConfig();
      service = dependencies.createServiceClient(config);
      persistence = dependencies.createPersistence();
      const owned = await persistence.getOwnedSubscriptionForCancellation(service, auth.userId);

      if (owned.status === "cancel_at_period_end") {
        const plan = await persistence.getMyCommercialPlan(auth.client);
        return NextResponse.json(planResponse(plan), { headers: { "Cache-Control": "private, no-store" } });
      }

      const occurredAt = dependencies.now().toISOString();
      const claim = await persistence.claimProviderEvent(service, {
        providerEventId: eventKey(owned.provider_subscription_id),
        eventType: "subscription_preapproval",
        resourceId: owned.provider_subscription_id,
        occurredAt,
        payload: { source: "authenticated_self_service_cancellation" },
      });
      if (!claim.claimed) {
        const plan = await persistence.getMyCommercialPlan(auth.client);
        const body = planResponse(plan);
        const processing = claim.processingStatus === "processing" || body.status === "processing";
        return NextResponse.json(
          processing ? { ...body, status: "processing", retryAfterSeconds: 2 } : body,
          {
            status: processing ? 202 : 200,
            headers: {
              "Cache-Control": "private, no-store",
              ...(processing ? { "Retry-After": "2" } : {}),
            },
          },
        );
      }
      claimedEventId = claim.eventId;

      const provider = dependencies.createProvider(config.mercadoPagoAccessToken);
      const before = await provider.getSubscription(owned.provider_subscription_id);
      assertProviderOwnership(before, owned.provider_subscription_id, owned.checkout_intent_id);
      if (!providerCancellationFinal(before.status)) {
        const cancelled = await provider.cancelSubscription(owned.provider_subscription_id);
        assertProviderOwnership(cancelled, owned.provider_subscription_id, owned.checkout_intent_id);
        if (!providerCancellationFinal(cancelled.status)) {
          throw new Error("BILLING_CANCELLATION_NOT_CONFIRMED");
        }
      }

      // Re-read the canonical provider object rather than trusting the PUT body.
      const snapshot = await loadProviderBillingSnapshot(
        provider,
        "subscription_preapproval",
        owned.provider_subscription_id,
      );
      if (
        snapshot.providerSubscriptionId !== owned.provider_subscription_id
        || snapshot.externalReference !== owned.checkout_intent_id
        || !providerCancellationFinal(snapshot.subscriptionStatus ?? "")
      ) throw new Error("BILLING_SUBSCRIPTION_REFERENCE_MISMATCH");

      await persistence.reconcileBillingEvent(service, claim.eventId, snapshot);
      claimedEventId = null;
      const plan = await persistence.getMyCommercialPlan(auth.client);
      const body = planResponse(plan);
      if (body.status === "processing") throw new Error("BILLING_CANCELLATION_REQUIRES_REVIEW");
      return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      if (service && persistence && claimedEventId) {
        const errorCode = error instanceof Error && /^[A-Z0-9_]{3,80}$/.test(error.message)
          ? error.message
          : "BILLING_CANCELLATION_FAILED";
        await persistence.failProviderEvent(service, {
          eventId: claimedEventId,
          errorCode,
        }).catch(() => undefined);
      }
      return billingErrorResponse(error);
    }
  };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const POST = createCancelSubscriptionHandler();
