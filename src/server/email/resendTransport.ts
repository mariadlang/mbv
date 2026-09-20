import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailRequestOptions,
  type CreateEmailResponse,
  type ErrorResponse,
} from "resend";
import { z } from "zod";
import type {
  EmailTransportResult,
  TransactionalEmailMessage,
  TransactionalEmailTransport,
} from "@/src/server/email/transport";

export interface ResendEmailRuntimeConfig {
  apiKey: string;
  from: string;
  replyTo: string;
  appBaseUrl: string;
  supportEmail: string;
}

export interface ResendEmailClient {
  emails: {
    send(
      payload: CreateEmailOptions,
      options?: CreateEmailRequestOptions,
    ): Promise<CreateEmailResponse>;
  };
}

type EmailEnvironment = Readonly<Record<string, string | undefined>>;

const plainEmailSchema = z.string().email().max(254);

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function mailboxAddress(value: string): string | null {
  if (!value || /[\r\n]/.test(value)) return null;
  const displayMailbox = /^[^<>]{1,100}<([^<>]+)>$/.exec(value);
  const address = (displayMailbox?.[1] ?? value).trim().toLowerCase();
  return plainEmailSchema.safeParse(address).success ? address : null;
}

function normalizedEmailDomain(value: string): string | null {
  const domain = value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (
    domain.length > 253
    || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
  ) return null;
  return domain;
}

function normalizedBaseUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const localDevelopment = url.protocol === "http:"
      && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localDevelopment) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Returns a complete runtime configuration or null. A partial or malformed
 * configuration must keep the outbox blocked instead of claiming messages.
 */
export function getResendEmailRuntimeConfig(
  environment: EmailEnvironment = process.env,
): ResendEmailRuntimeConfig | null {
  const enabled = clean(environment.TRANSACTIONAL_EMAIL_ENABLED) === "1";
  const apiKey = clean(environment.RESEND_API_KEY);
  const emailDomain = normalizedEmailDomain(clean(environment.RESEND_EMAIL_DOMAIN));
  const from = clean(environment.TRANSACTIONAL_EMAIL_FROM)
    || (emailDomain ? `My Best Version <hola@${emailDomain}>` : "");
  const configuredReplyTo = clean(environment.TRANSACTIONAL_EMAIL_REPLY_TO);
  const supportEmail = clean(
    environment.TRANSACTIONAL_EMAIL_SUPPORT_EMAIL
      || environment.NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL
      || (emailDomain ? `soporte@${emailDomain}` : ""),
  ).toLowerCase();
  const appBaseUrl = normalizedBaseUrl(clean(environment.APP_BASE_URL));
  const fromAddress = mailboxAddress(from);
  const replyTo = (configuredReplyTo || supportEmail).toLowerCase();

  if (
    !enabled
    || !apiKey.startsWith("re_")
    || apiKey.length < 20
    || !fromAddress
    || !plainEmailSchema.safeParse(replyTo).success
    || !plainEmailSchema.safeParse(supportEmail).success
    || !appBaseUrl
  ) return null;

  return { apiKey, from, replyTo, appBaseUrl, supportEmail };
}

function resendErrorCode(error: ErrorResponse): string {
  switch (error.name) {
    case "missing_api_key":
    case "restricted_api_key":
    case "invalid_api_key":
      return "EMAIL_PROVIDER_AUTH_FAILED";
    case "invalid_from_address":
      return "EMAIL_PROVIDER_SENDER_INVALID";
    case "invalid_idempotency_key":
      return "EMAIL_PROVIDER_IDEMPOTENCY_INVALID";
    case "invalid_idempotent_request":
      return "EMAIL_PROVIDER_IDEMPOTENCY_CONFLICT";
    case "concurrent_idempotent_requests":
    case "rate_limit_exceeded":
      return "EMAIL_PROVIDER_RATE_LIMITED";
    case "monthly_quota_exceeded":
    case "daily_quota_exceeded":
      return "EMAIL_PROVIDER_QUOTA_EXCEEDED";
    case "security_error":
    case "invalid_access":
      return "EMAIL_PROVIDER_FORBIDDEN";
    case "application_error":
    case "internal_server_error":
      return "EMAIL_PROVIDER_UNAVAILABLE";
    default:
      return "EMAIL_PROVIDER_REQUEST_INVALID";
  }
}

function resendTags(tags: TransactionalEmailMessage["tags"]): Array<{ name: string; value: string }> {
  const entries = Object.entries(tags ?? {});
  if (entries.some(([name, value]) => (
    !/^[a-zA-Z0-9_-]{1,256}$/.test(name)
    || !/^[a-zA-Z0-9_-]{1,256}$/.test(value)
  ))) throw new Error("EMAIL_PROVIDER_TAG_INVALID");
  return entries.map(([name, value]) => ({ name, value }));
}

export class ResendEmailTransport implements TransactionalEmailTransport {
  readonly name = "resend";
  readonly mode = "live";

  private readonly client: ResendEmailClient;

  constructor(
    private readonly config: Pick<ResendEmailRuntimeConfig, "apiKey" | "from" | "replyTo">,
    client?: ResendEmailClient,
  ) {
    this.client = client ?? new Resend(config.apiKey);
  }

  async send(message: TransactionalEmailMessage): Promise<EmailTransportResult> {
    if (
      !message.dedupeKey
      || message.dedupeKey.length > 256
      || /[\r\n]/.test(message.dedupeKey)
    ) throw new Error("EMAIL_PROVIDER_IDEMPOTENCY_INVALID");

    const tags = resendTags(message.tags);
    let response: CreateEmailResponse;
    try {
      response = await this.client.emails.send({
        from: this.config.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: this.config.replyTo,
        ...(tags.length ? { tags } : {}),
      }, { idempotencyKey: message.dedupeKey });
    } catch {
      throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
    }

    if (response.error) throw new Error(resendErrorCode(response.error));
    const providerMessageId = response.data.id?.trim();
    if (!providerMessageId) throw new Error("EMAIL_PROVIDER_INVALID_RESPONSE");
    return { status: "accepted", providerMessageId };
  }
}
