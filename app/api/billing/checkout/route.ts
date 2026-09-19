import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { BILLING_INTERVALS, getPremiumOffer } from "@/src/domain/commercialOffer";
import { authenticateRequest, type ServerAuthContext } from "@/src/lib/serverAuth";
import {
  createBillingServiceClient,
  requireBillingServerConfig,
  type BillingServerConfig,
} from "@/src/server/billing/config";
import { billingErrorResponse } from "@/src/server/billing/http";
import {
  MercadoPagoApiError,
  MercadoPagoClient,
  type MercadoPagoSubscription,
} from "@/src/server/billing/mercadoPagoClient";
import { providerAmountToMinor } from "@/src/server/billing/reconciliation";
import {
  SupabaseBillingPersistence,
  type BillingPersistence,
  type StaleReadyCheckoutIntent,
} from "@/src/server/billing/repository";

const checkoutRequestSchema = z.object({ interval: z.enum(BILLING_INTERVALS) }).strict();

interface CheckoutRouteDependencies {
  authenticate(request: NextRequest): Promise<ServerAuthContext>;
  getConfig(): BillingServerConfig;
  createServiceClient(config: BillingServerConfig): SupabaseClient;
  createPersistence(): BillingPersistence;
  createProvider(accessToken: string): MercadoPagoClient;
  getPayerEmail(client: SupabaseClient, userId: string): Promise<string>;
  now(): Date;
}

const productionDependencies: CheckoutRouteDependencies = {
  authenticate: authenticateRequest,
  getConfig: requireBillingServerConfig,
  createServiceClient: createBillingServiceClient,
  createPersistence: () => new SupabaseBillingPersistence(),
  createProvider: (accessToken) => new MercadoPagoClient(accessToken),
  getPayerEmail: async (client, userId) => {
    const { data: profile, error } = await client
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return z.string().email().parse(profile?.email);
  },
  now: () => new Date(),
};

function providerStatusIsTerminal(status: string): boolean {
  return ["cancelled", "canceled", "ended", "terminated", "expired", "rejected", "failed"]
    .includes(status.trim().toLowerCase());
}

function providerUpdatedAt(subscription: MercadoPagoSubscription): string {
  const updatedAt = subscription.last_modified ?? subscription.date_created;
  if (!updatedAt) throw new MercadoPagoApiError(502, "MERCADO_PAGO_INVALID_RESPONSE");
  return updatedAt;
}

function assertProviderMatchesIntent(
  subscription: MercadoPagoSubscription,
  intent: Pick<StaleReadyCheckoutIntent, "id" | "plan_interval" | "amount_minor" | "currency" | "provider_subscription_id">,
) {
  const offer = getPremiumOffer(intent.plan_interval);
  if (
    subscription.id !== intent.provider_subscription_id
    || subscription.external_reference !== intent.id
    || providerAmountToMinor(subscription.auto_recurring.transaction_amount) !== intent.amount_minor
    || subscription.auto_recurring.currency_id !== intent.currency
    || intent.amount_minor !== offer.amountMinor
    || intent.currency !== offer.currency
    || subscription.auto_recurring.frequency !== offer.frequency
    || subscription.auto_recurring.frequency_type !== offer.frequencyType
  ) throw new Error("BILLING_CATALOG_MISMATCH");
}

export function createCheckoutHandler(overrides: Partial<CheckoutRouteDependencies> = {}) {
  const dependencies = { ...productionDependencies, ...overrides };
  return async function checkout(request: NextRequest) {
    let lease: { intentId: string; claimToken: string } | null = null;
    let service: SupabaseClient | null = null;
    const persistence = dependencies.createPersistence();
    try {
      const auth = await dependencies.authenticate(request);
      if (auth.e2e || !auth.client) throw new Response("BILLING_NOT_CONFIGURED", { status: 503 });
      const input = checkoutRequestSchema.parse(await request.json().catch(() => null));
      const config = dependencies.getConfig();
      service = dependencies.createServiceClient(config);
      const payerEmail = await dependencies.getPayerEmail(auth.client, auth.userId);
      let provider: MercadoPagoClient | null = null;

      const staleIntent = await persistence.getStaleReadyCheckoutIntent(
        service,
        auth.userId,
        dependencies.now().toISOString(),
      );
      if (staleIntent) {
        provider = dependencies.createProvider(config.mercadoPagoAccessToken);
        const canonical = await provider.getSubscription(staleIntent.provider_subscription_id);
        assertProviderMatchesIntent(canonical, staleIntent);
        if (providerStatusIsTerminal(canonical.status)) {
          await persistence.closeStaleCheckoutIntent(service, {
            intentId: staleIntent.id,
            providerSubscriptionId: canonical.id,
            providerStatus: canonical.status,
            providerUpdatedAt: providerUpdatedAt(canonical),
          });
        } else {
          if (staleIntent.plan_interval !== input.interval) throw new Error("CHECKOUT_ALREADY_OPEN");
          return NextResponse.json({
            status: "ready",
            checkoutUrl: staleIntent.checkout_url,
            interval: staleIntent.plan_interval,
            amountMinor: staleIntent.amount_minor,
            currency: staleIntent.currency,
            reused: true,
          }, { headers: { "Cache-Control": "no-store" } });
        }
      }

      const intent = await persistence.createCheckoutIntent(auth.client, input.interval);
      const offer = getPremiumOffer(input.interval);
      if (intent.plan !== input.interval || intent.amount_minor !== offer.amountMinor || intent.currency !== offer.currency) {
        throw new Error("BILLING_CATALOG_MISMATCH");
      }
      if (intent.checkout_url && intent.provider_subscription_id) {
        return NextResponse.json({
          status: "ready",
          checkoutUrl: intent.checkout_url,
          interval: intent.plan,
          amountMinor: intent.amount_minor,
          currency: intent.currency,
          reused: true,
        }, { headers: { "Cache-Control": "no-store" } });
      }
      if (!intent.claim_token) {
        return NextResponse.json({ status: "creating", retryAfterSeconds: 2 }, {
          status: 202,
          headers: { "Cache-Control": "no-store", "Retry-After": "2" },
        });
      }
      lease = { intentId: intent.id, claimToken: intent.claim_token };
      provider ??= dependencies.createProvider(config.mercadoPagoAccessToken);
      const checkoutInput = {
        interval: input.interval,
        payerEmail,
        externalReference: intent.id,
        appBaseUrl: config.appBaseUrl,
      };
      const existingSubscription = await provider.findSubscriptionByExternalReference(intent.id);
      const subscription = existingSubscription ?? await provider.createSubscriptionCheckout(checkoutInput);
      assertProviderMatchesIntent(subscription, {
        id: intent.id,
        plan_interval: intent.plan,
        amount_minor: intent.amount_minor,
        currency: intent.currency,
        provider_subscription_id: subscription.id,
      });
      if (!subscription.init_point) throw new MercadoPagoApiError(502, "MERCADO_PAGO_INVALID_RESPONSE");
      await persistence.completeCheckoutIntent(service, {
        intentId: intent.id,
        claimToken: intent.claim_token,
        providerSubscriptionId: subscription.id,
        checkoutUrl: subscription.init_point,
        providerStatus: subscription.status,
        providerUpdatedAt: providerUpdatedAt(subscription),
      });
      lease = null;
      return NextResponse.json({
        status: "ready",
        checkoutUrl: subscription.init_point,
        interval: intent.plan,
        amountMinor: intent.amount_minor,
        currency: intent.currency,
        reused: Boolean(existingSubscription),
      }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (service && lease) {
        const errorCode = error instanceof Error && /^[A-Z0-9_]{3,80}$/.test(error.message)
          ? error.message
          : "CHECKOUT_PROVIDER_FAILED";
        await persistence.releaseCheckoutIntent(service, { ...lease, errorCode }).catch(() => undefined);
      }
      return billingErrorResponse(error);
    }
  };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const POST = createCheckoutHandler();
