import { z } from "zod";
import type { BillingInterval } from "@/src/domain/commercialOffer";
import type { ClaimedEmailOutboxRow } from "@/src/server/email/outbox";
import {
  renderTransactionalEmail,
  type RenderedTransactionalEmail,
  type TransactionalEmailInput,
} from "@/src/server/email/templates";

const dateTime = z.string().datetime({ offset: true });
const interval = z.enum(["monthly", "annual"]);
const paidPeriod = z.object({
  plan_interval: interval,
  amount_minor: z.number().int().nonnegative(),
  currency: z.literal("USD"),
  period_start: dateTime,
  period_end: dateTime,
  next_payment_at: dateTime.nullable().optional(),
  renewal_reference_at: dateTime.nullable().optional(),
});

export interface EmailOutboxRenderContext {
  appUrl: string;
  subscriptionUrl: string;
  supportEmail: string;
  adminRecordUrl: (userId: string) => string;
  timeZone?: string;
}

function dateOnlyToIso(value: string): string {
  return `${z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(value)}T12:00:00.000Z`;
}

function renewalDescription(reference: string | null | undefined, intervalValue: BillingInterval): string {
  if (!reference) return intervalValue === "monthly" ? "Renovación mensual" : "Renovación anual";
  return `Próxima fecha prevista: ${reference.slice(0, 10)}`;
}

function userCommon(context: EmailOutboxRenderContext) {
  return {
    appUrl: context.appUrl,
    subscriptionUrl: context.subscriptionUrl,
    supportEmail: context.supportEmail,
    timeZone: context.timeZone,
  };
}

function inputFromOutbox(
  row: ClaimedEmailOutboxRow,
  context: EmailOutboxRenderContext,
): TransactionalEmailInput {
  const common = userCommon(context);
  switch (row.templateKey) {
    case "premium_welcome": {
      const data = paidPeriod.parse(row.templateData);
      return {
        kind: row.templateKey,
        ...common,
        interval: data.plan_interval,
        amountMinor: data.amount_minor,
        currency: data.currency,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        renewalDescription: renewalDescription(
          data.renewal_reference_at ?? data.next_payment_at,
          data.plan_interval,
        ),
      };
    }
    case "subscription_renewed": {
      const data = paidPeriod.parse(row.templateData);
      return {
        kind: row.templateKey,
        ...common,
        interval: data.plan_interval,
        amountMinor: data.amount_minor,
        currency: data.currency,
        periodStart: data.period_start,
        periodEnd: data.period_end,
      };
    }
    case "commercial_eligibility_admin": {
      const data = z.object({
        user_id: z.string().uuid(),
        user_email: z.string().email(),
        user_name: z.string().nullable(),
        eligible_at: dateTime,
        period_started_on: z.string(),
        period_ended_on: z.string(),
      }).parse(row.templateData);
      return {
        kind: row.templateKey,
        userName: data.user_name,
        userEmail: data.user_email,
        eligibleAt: data.eligible_at,
        participationStart: dateOnlyToIso(data.period_started_on),
        participationEnd: dateOnlyToIso(data.period_ended_on),
        adminRecordUrl: context.adminRecordUrl(data.user_id),
        supportEmail: context.supportEmail,
        timeZone: context.timeZone,
      };
    }
    case "commercial_trial_activated": {
      const data = z.object({ trial_started_at: dateTime, trial_ends_at: dateTime }).parse(row.templateData);
      return {
        kind: row.templateKey,
        ...common,
        trialStart: data.trial_started_at,
        trialEnd: data.trial_ends_at,
      };
    }
    case "commercial_trial_ended":
      return { kind: row.templateKey, ...common };
    case "renewal_payment_requested": {
      const data = z.object({
        plan_interval: interval,
        amount_minor: z.number().int().nonnegative(),
        currency: z.literal("USD"),
        due_at: dateTime,
        payment_url: z.string().url(),
      }).parse(row.templateData);
      return {
        kind: row.templateKey,
        ...common,
        interval: data.plan_interval,
        amountMinor: data.amount_minor,
        currency: data.currency,
        dueAt: data.due_at,
        paymentUrl: data.payment_url,
      };
    }
    case "renewal_pending": {
      const data = z.object({
        plan_interval: interval,
        next_review_at: dateTime.nullable().optional(),
      }).parse(row.templateData);
      return {
        kind: row.templateKey,
        ...common,
        interval: data.plan_interval,
        nextReviewAt: data.next_review_at,
      };
    }
    case "payment_failed": {
      const data = z.object({ status_detail: z.string().max(80).nullable().optional() }).parse(row.templateData);
      return {
        kind: row.templateKey,
        ...common,
        actionUrl: context.subscriptionUrl,
        statusDetail: data.status_detail,
      };
    }
    case "subscription_cancelled": {
      const data = z.object({
        cancelled_at: dateTime,
        access_until: dateTime.nullable().optional(),
      }).parse(row.templateData);
      return {
        kind: row.templateKey,
        ...common,
        cancelledAt: data.cancelled_at,
        accessUntil: data.access_until,
      };
    }
  }
}

export function renderEmailOutboxRow(
  row: ClaimedEmailOutboxRow,
  context: EmailOutboxRenderContext,
): RenderedTransactionalEmail {
  return renderTransactionalEmail(inputFromOutbox(row, context));
}
