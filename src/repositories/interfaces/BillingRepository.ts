import type { BillingInterval } from "@/src/domain/commercialOffer";
import type {
  AccessStatus,
  CommercialEligibilityStatus,
  PremiumSource,
  SubscriptionStatus,
} from "@/src/domain/access";

export type BillingCheckoutResult =
  | { status: "ready"; checkoutUrl: string; interval: BillingInterval; amountMinor: number; currency: "USD"; reused: boolean }
  | { status: "creating"; retryAfterSeconds: number };

export const BILLING_CANCELLATION_CONFIRMATION = "CANCELAR_RENOVACION" as const;

export type BillingCancellationResult =
  | {
      status: "scheduled" | "ended";
      accessStatus: AccessStatus;
      subscriptionStatus: SubscriptionStatus;
      cancelAtPeriodEnd: boolean;
      accessUntil: string | null;
      serverNow: string;
    }
  | {
      status: "processing";
      accessStatus: AccessStatus;
      subscriptionStatus: SubscriptionStatus;
      cancelAtPeriodEnd: boolean;
      accessUntil: string | null;
      serverNow: string;
      retryAfterSeconds: number;
    };

export interface BillingStatusResult {
  accessStatus: AccessStatus;
  subscriptionStatus: SubscriptionStatus;
  interval: BillingInterval | null;
  premiumSource: PremiumSource | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  eligibilityStatus: CommercialEligibilityStatus | null;
  campaignKey: string | null;
  currentStreakDays: number;
  eligibleAt: string | null;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  nextPaymentAt: string | null;
  cancelAtPeriodEnd: boolean;
  serverNow: string;
}

export interface BillingRepository {
  createCheckout(accessToken: string, interval: BillingInterval): Promise<BillingCheckoutResult>;
  getStatus(accessToken: string): Promise<BillingStatusResult>;
  cancelSubscription(accessToken: string): Promise<BillingCancellationResult>;
}
