import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/src/lib/serverAuth";
import { billingErrorResponse } from "@/src/server/billing/http";
import { SupabaseBillingPersistence } from "@/src/server/billing/repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.e2e || !auth.client) throw new Response("BILLING_NOT_CONFIGURED", { status: 503 });
    const plan = await new SupabaseBillingPersistence().getMyCommercialPlan(auth.client);
    return NextResponse.json({
      accessStatus: plan.access_status,
      subscriptionStatus: plan.subscription_status,
      interval: plan.plan_interval,
      premiumSource: plan.premium_source,
      trialStartedAt: plan.trial_started_at,
      trialEndsAt: plan.trial_ends_at,
      eligibilityStatus: plan.eligibility_status,
      campaignKey: plan.campaign_key,
      currentStreakDays: plan.current_streak_days,
      eligibleAt: plan.eligible_at,
      currentPeriodStartsAt: plan.current_period_starts_at,
      currentPeriodEndsAt: plan.current_period_ends_at,
      nextPaymentAt: plan.next_payment_at,
      cancelAtPeriodEnd: plan.cancel_at_period_end,
      serverNow: plan.server_now,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
