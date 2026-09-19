import { getPremiumOffer, type BillingInterval } from "@/src/domain/commercialOffer";
import {
  MercadoPagoApiError,
  type MercadoPagoAuthorizedPayment,
  type MercadoPagoClient,
  type MercadoPagoPayment,
  type MercadoPagoSubscription,
} from "@/src/server/billing/mercadoPagoClient";
/*
 * The event payload is only a pointer. Canonical values below always come
 * from the provider API, and the fetched resource must match that pointer.
 */

export const MERCADO_PAGO_BILLING_TOPICS = [
  "subscription_preapproval",
  "subscription_authorized_payment",
  "payment",
] as const;

export type MercadoPagoBillingTopic = typeof MERCADO_PAGO_BILLING_TOPICS[number];

export interface ProviderBillingSnapshot {
  eventType: MercadoPagoBillingTopic;
  resourceId: string;
  providerSubscriptionId: string | null;
  externalReference: string | null;
  providerPaymentId: string | null;
  subscriptionStatus: string | null;
  paymentStatus: string | null;
  statusDetail: string | null;
  amountMinor: number | null;
  currency: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  nextPaymentAt: string | null;
  providerUpdatedAt: string;
}

export interface ExistingReconciliationState {
  processedPaymentIds: readonly string[];
  resourceUpdatedAt: Readonly<Record<string, string | undefined>>;
}

export interface ReconciliationDecision {
  action: "apply" | "ignore" | "review";
  reason: "current" | "duplicate_payment" | "stale_resource" | "catalog_mismatch" | "missing_paid_period";
  grantPaidAccess: boolean;
  revokePaidAccess: boolean;
}

export function isMercadoPagoBillingTopic(value: string): value is MercadoPagoBillingTopic {
  return MERCADO_PAGO_BILLING_TOPICS.includes(value as MercadoPagoBillingTopic);
}

export function providerAmountToMinor(value: number | string): number | null {
  const normalized = typeof value === "number" ? String(value) : value.trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0"));
  const minor = whole * BigInt(100) + fraction;
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}

function latestIso(...values: Array<string | null | undefined>): string {
  const valid = values
    .filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))))
    .sort((left, right) => Date.parse(right) - Date.parse(left));
  return valid[0] ?? new Date(0).toISOString();
}

function normalizedSubscription(
  eventType: MercadoPagoBillingTopic,
  resourceId: string,
  subscription: MercadoPagoSubscription,
): ProviderBillingSnapshot {
  return {
    eventType,
    resourceId,
    providerSubscriptionId: subscription.id,
    externalReference: subscription.external_reference ?? null,
    providerPaymentId: null,
    subscriptionStatus: subscription.status,
    paymentStatus: null,
    statusDetail: null,
    amountMinor: providerAmountToMinor(subscription.auto_recurring.transaction_amount),
    currency: subscription.auto_recurring.currency_id,
    periodStart: subscription.auto_recurring.start_date ?? null,
    periodEnd: subscription.next_payment_date ?? null,
    nextPaymentAt: subscription.next_payment_date ?? null,
    providerUpdatedAt: latestIso(subscription.last_modified, subscription.date_created),
  };
}

function normalizedInvoice(
  eventType: MercadoPagoBillingTopic,
  resourceId: string,
  invoice: MercadoPagoAuthorizedPayment,
  subscription: MercadoPagoSubscription,
): ProviderBillingSnapshot {
  return {
    eventType,
    resourceId,
    providerSubscriptionId: invoice.preapproval_id,
    externalReference: invoice.external_reference ?? subscription.external_reference ?? null,
    providerPaymentId: invoice.payment?.id ?? null,
    subscriptionStatus: subscription.status,
    paymentStatus: invoice.payment?.status ?? invoice.summarized ?? invoice.status,
    statusDetail: invoice.payment?.status_detail ?? null,
    amountMinor: providerAmountToMinor(invoice.transaction_amount),
    currency: invoice.currency_id,
    periodStart: invoice.debit_date ?? invoice.date_created ?? null,
    periodEnd: subscription.next_payment_date ?? null,
    nextPaymentAt: subscription.next_payment_date ?? null,
    providerUpdatedAt: latestIso(invoice.last_modified, subscription.last_modified, invoice.date_created),
  };
}

function normalizedPayment(
  resourceId: string,
  payment: MercadoPagoPayment,
  invoice: MercadoPagoAuthorizedPayment | null,
  subscription: MercadoPagoSubscription | null,
): ProviderBillingSnapshot {
  return {
    eventType: "payment",
    resourceId,
    providerSubscriptionId: invoice?.preapproval_id ?? subscription?.id ?? null,
    externalReference: payment.external_reference ?? invoice?.external_reference ?? subscription?.external_reference ?? null,
    providerPaymentId: payment.id,
    subscriptionStatus: subscription?.status ?? null,
    paymentStatus: payment.status,
    statusDetail: payment.status_detail ?? null,
    amountMinor: providerAmountToMinor(payment.transaction_amount),
    currency: payment.currency_id,
    periodStart: invoice?.debit_date ?? payment.date_approved ?? payment.date_created ?? null,
    periodEnd: subscription?.next_payment_date ?? null,
    nextPaymentAt: subscription?.next_payment_date ?? null,
    providerUpdatedAt: latestIso(
      payment.date_last_updated,
      invoice?.last_modified,
      subscription?.last_modified,
      payment.date_created,
    ),
  };
}

export async function loadProviderBillingSnapshot(
  client: MercadoPagoClient,
  eventType: MercadoPagoBillingTopic,
  resourceId: string,
): Promise<ProviderBillingSnapshot> {
  if (eventType === "subscription_preapproval") {
    const subscription = await client.getSubscription(resourceId);
    if (subscription.id !== resourceId) {
      throw new MercadoPagoApiError(502, "MERCADO_PAGO_RESOURCE_MISMATCH");
    }
    return normalizedSubscription(eventType, resourceId, subscription);
  }
  if (eventType === "subscription_authorized_payment") {
    const invoice = await client.getAuthorizedPayment(resourceId);
    if (invoice.id !== resourceId) {
      throw new MercadoPagoApiError(502, "MERCADO_PAGO_RESOURCE_MISMATCH");
    }
    const subscription = await client.getSubscription(invoice.preapproval_id);
    if (subscription.id !== invoice.preapproval_id) {
      throw new MercadoPagoApiError(502, "MERCADO_PAGO_RESOURCE_MISMATCH");
    }
    return normalizedInvoice(eventType, resourceId, invoice, subscription);
  }
  const payment = await client.getPayment(resourceId);
  if (payment.id !== resourceId) {
    throw new MercadoPagoApiError(502, "MERCADO_PAGO_RESOURCE_MISMATCH");
  }
  const invoice = await client.findAuthorizedPaymentByPaymentId(payment.id);
  const subscription = invoice ? await client.getSubscription(invoice.preapproval_id) : null;
  if (
    (invoice?.payment?.id && invoice.payment.id !== payment.id)
    || (invoice && subscription?.id !== invoice.preapproval_id)
  ) {
    throw new MercadoPagoApiError(502, "MERCADO_PAGO_RESOURCE_MISMATCH");
  }
  return normalizedPayment(resourceId, payment, invoice, subscription);
}

function isApproved(status: string | null): boolean {
  return status === "approved" || status === "succeeded";
}

export function decideBillingReconciliation(
  existing: ExistingReconciliationState,
  incoming: ProviderBillingSnapshot,
  expectedInterval: BillingInterval,
): ReconciliationDecision {
  if (incoming.providerPaymentId && existing.processedPaymentIds.includes(incoming.providerPaymentId)) {
    return { action: "ignore", reason: "duplicate_payment", grantPaidAccess: false, revokePaidAccess: false };
  }
  const resourceKey = `${incoming.eventType}:${incoming.resourceId}`;
  const priorUpdate = existing.resourceUpdatedAt[resourceKey];
  if (priorUpdate && Date.parse(incoming.providerUpdatedAt) <= Date.parse(priorUpdate)) {
    return { action: "ignore", reason: "stale_resource", grantPaidAccess: false, revokePaidAccess: false };
  }
  if (isApproved(incoming.paymentStatus)) {
    const offer = getPremiumOffer(expectedInterval);
    if (incoming.amountMinor !== offer.amountMinor || incoming.currency !== offer.currency) {
      return { action: "review", reason: "catalog_mismatch", grantPaidAccess: false, revokePaidAccess: false };
    }
    if (!incoming.periodEnd || !Number.isFinite(Date.parse(incoming.periodEnd))) {
      return { action: "review", reason: "missing_paid_period", grantPaidAccess: false, revokePaidAccess: false };
    }
    return { action: "apply", reason: "current", grantPaidAccess: true, revokePaidAccess: false };
  }
  // Pending, rejected, paused and cancelled provider states are persisted, but
  // never erase an already-paid period. Expiry is evaluated from paid-through
  // dates by the database/maintenance flow, not by notification arrival order.
  return { action: "apply", reason: "current", grantPaidAccess: false, revokePaidAccess: false };
}
