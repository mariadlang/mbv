import { z } from "zod";
import { getPremiumOffer, minorUnitsToDecimal, type BillingInterval } from "@/src/domain/commercialOffer";

const MERCADO_PAGO_API = "https://api.mercadopago.com";

const identifierSchema = z.union([z.string().min(1).max(200), z.number().int().nonnegative()]).transform(String);
const optionalDateSchema = z.string().datetime({ offset: true }).nullable().optional();

const subscriptionSchema = z.object({
  id: identifierSchema,
  status: z.string().min(1).max(80),
  external_reference: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
  init_point: z.string().url().nullable().optional(),
  payer_id: identifierSchema.nullable().optional(),
  next_payment_date: optionalDateSchema,
  date_created: optionalDateSchema,
  last_modified: optionalDateSchema,
  auto_recurring: z.object({
    frequency: z.number().int().positive(),
    frequency_type: z.string(),
    transaction_amount: z.union([z.number(), z.string()]),
    currency_id: z.string(),
    start_date: optionalDateSchema,
    end_date: optionalDateSchema,
  }),
}).passthrough();

const invoiceSchema = z.object({
  id: identifierSchema,
  preapproval_id: z.string().min(1).max(200),
  status: z.string().min(1).max(80),
  summarized: z.string().nullable().optional(),
  external_reference: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
  currency_id: z.string(),
  transaction_amount: z.union([z.number(), z.string()]),
  debit_date: optionalDateSchema,
  date_created: optionalDateSchema,
  last_modified: optionalDateSchema,
  payment: z.object({
    id: identifierSchema,
    status: z.string(),
    status_detail: z.string().nullable().optional(),
  }).nullable().optional(),
}).passthrough();

const paymentSchema = z.object({
  id: identifierSchema,
  status: z.string().min(1).max(80),
  status_detail: z.string().nullable().optional(),
  external_reference: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
  transaction_amount: z.union([z.number(), z.string()]),
  currency_id: z.string(),
  date_created: optionalDateSchema,
  date_approved: optionalDateSchema,
  date_last_updated: optionalDateSchema,
}).passthrough();

const invoiceSearchSchema = z.object({ results: z.array(invoiceSchema) }).passthrough();
const subscriptionSearchSchema = z.object({ results: z.array(subscriptionSchema) }).passthrough();

export type MercadoPagoSubscription = z.infer<typeof subscriptionSchema>;
export type MercadoPagoAuthorizedPayment = z.infer<typeof invoiceSchema>;
export type MercadoPagoPayment = z.infer<typeof paymentSchema>;

export interface SubscriptionCheckoutRequest {
  reason: string;
  external_reference: string;
  payer_email: string;
  auto_recurring: {
    frequency: number;
    frequency_type: "months";
    transaction_amount: number;
    currency_id: "USD";
  };
  back_url: string;
  notification_url: string;
  status: "pending";
}

export interface BuildCheckoutInput {
  interval: BillingInterval;
  payerEmail: string;
  externalReference: string;
  appBaseUrl: string;
}

function providerAmount(amountMinor: number): number {
  // JSON has no decimal scalar. The decimal string is converted only at the
  // provider boundary; all internal contracts remain integer minor units.
  return Number(minorUnitsToDecimal(amountMinor));
}

function safeBackUrl(appBaseUrl: string): string {
  const base = new URL(appBaseUrl);
  return new URL("/upgrade?billing=confirming", base).toString();
}

function safeWebhookUrl(appBaseUrl: string): string {
  const base = new URL(appBaseUrl);
  return new URL("/api/billing/mercado-pago/webhook", base).toString();
}

export function buildSubscriptionCheckoutRequest(input: BuildCheckoutInput): SubscriptionCheckoutRequest {
  const offer = getPremiumOffer(input.interval);
  const payerEmail = z.string().trim().email().max(320).parse(input.payerEmail);
  const externalReference = z.string().uuid().parse(input.externalReference);
  return {
    reason: `My Best Version Premium ${input.interval === "monthly" ? "mensual" : "anual"}`,
    external_reference: externalReference,
    payer_email: payerEmail,
    auto_recurring: {
      frequency: offer.frequency,
      frequency_type: offer.frequencyType,
      transaction_amount: providerAmount(offer.amountMinor),
      currency_id: offer.currency,
    },
    back_url: safeBackUrl(input.appBaseUrl),
    notification_url: safeWebhookUrl(input.appBaseUrl),
    status: "pending",
  };
}

function isMercadoPagoCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && !url.port
      && (host === "mercadopago.com.co" || host.endsWith(".mercadopago.com.co"));
  } catch {
    return false;
  }
}

export class MercadoPagoApiError extends Error {
  readonly retryable: boolean;

  constructor(readonly status: number, readonly code: string) {
    super(code);
    this.name = "MercadoPagoApiError";
    this.retryable = status === 408 || status === 429 || status >= 500;
  }
}

export class MercadoPagoClient {
  constructor(
    private readonly accessToken: string,
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly baseUrl = MERCADO_PAGO_API,
  ) {}

  private async request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new MercadoPagoApiError(response.status, `MERCADO_PAGO_HTTP_${response.status}`);
      const payload: unknown = await response.json().catch(() => {
        throw new MercadoPagoApiError(502, "MERCADO_PAGO_INVALID_RESPONSE");
      });
      const parsed = schema.safeParse(payload);
      if (!parsed.success) throw new MercadoPagoApiError(502, "MERCADO_PAGO_INVALID_RESPONSE");
      return parsed.data;
    } catch (error) {
      if (error instanceof MercadoPagoApiError) throw error;
      throw new MercadoPagoApiError(503, "MERCADO_PAGO_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }

  async createSubscriptionCheckout(input: BuildCheckoutInput): Promise<MercadoPagoSubscription> {
    const subscription = await this.request("/preapproval", subscriptionSchema, {
      method: "POST",
      body: JSON.stringify(buildSubscriptionCheckoutRequest(input)),
      headers: { "X-Idempotency-Key": input.externalReference },
    });
    if (!subscription.init_point || !isMercadoPagoCheckoutUrl(subscription.init_point)) {
      throw new MercadoPagoApiError(502, "MERCADO_PAGO_INVALID_CHECKOUT_URL");
    }
    return subscription;
  }

  async findSubscriptionByExternalReference(externalReference: string): Promise<MercadoPagoSubscription | null> {
    const result = await this.request(
      `/preapproval/search?q=${encodeURIComponent(externalReference)}`,
      subscriptionSearchSchema,
    );
    const subscription = result.results.find(
      (candidate) => candidate.external_reference === externalReference,
    );
    if (!subscription) return null;
    if (!subscription.init_point || !isMercadoPagoCheckoutUrl(subscription.init_point)) {
      throw new MercadoPagoApiError(502, "MERCADO_PAGO_INVALID_CHECKOUT_URL");
    }
    return subscription;
  }

  getSubscription(id: string): Promise<MercadoPagoSubscription> {
    return this.request(`/preapproval/${encodeURIComponent(id)}`, subscriptionSchema);
  }

  cancelSubscription(id: string): Promise<MercadoPagoSubscription> {
    return this.request(`/preapproval/${encodeURIComponent(id)}`, subscriptionSchema, {
      method: "PUT",
      // Mercado Pago documents the cancellation status with one "l".
      body: JSON.stringify({ status: "canceled" }),
    });
  }

  getAuthorizedPayment(id: string): Promise<MercadoPagoAuthorizedPayment> {
    return this.request(`/authorized_payments/${encodeURIComponent(id)}`, invoiceSchema);
  }

  getPayment(id: string): Promise<MercadoPagoPayment> {
    return this.request(`/v1/payments/${encodeURIComponent(id)}`, paymentSchema);
  }

  async findAuthorizedPaymentByPaymentId(id: string): Promise<MercadoPagoAuthorizedPayment | null> {
    const result = await this.request(
      `/authorized_payments/search?payment_id=${encodeURIComponent(id)}`,
      invoiceSearchSchema,
    );
    return result.results[0] ?? null;
  }
}
