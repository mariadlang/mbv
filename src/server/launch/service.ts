import type { LaunchAccessRuntimeConfig } from "@/src/server/launch/config";
import {
  LaunchAccessError,
  launchAccessEmailSchema,
  launchAccessRequestSchema,
  type LaunchAccessLocale,
  type LaunchAccessPublicStatus,
  type LaunchAccessRequestType,
} from "@/src/server/launch/schema";
import type { LaunchAccessRepository } from "@/src/server/launch/repository";
import { launchFingerprint, verifyLaunchConfirmationToken } from "@/src/server/launch/token";

export interface LaunchAccessServiceDependencies {
  config: LaunchAccessRuntimeConfig;
  repository: LaunchAccessRepository;
}

export interface RequestLaunchAccessInput {
  email: string;
  clientIdentity: string;
  locale: LaunchAccessLocale;
  newsletterOptIn: boolean;
  origin: "landing_launch";
  requestType: LaunchAccessRequestType;
}

export type RequestLaunchAccessResult =
  | { status: "request_received" }
  | { status: "newsletter_subscribed" };

export async function requestLaunchAccess(
  input: RequestLaunchAccessInput,
  dependencies: LaunchAccessServiceDependencies,
  now: Date = new Date(),
): Promise<RequestLaunchAccessResult> {
  const parsed = launchAccessRequestSchema.safeParse({
    email: input.email,
    locale: input.locale,
    newsletterOptIn: input.newsletterOptIn,
    origin: input.origin,
    requestType: input.requestType,
  });
  if (!parsed.success) {
    if (!launchAccessEmailSchema.safeParse(input.email).success) {
      throw new LaunchAccessError("INVALID_EMAIL");
    }
    throw new LaunchAccessError("INVALID_REQUEST");
  }
  const { email, newsletterOptIn, origin, requestType } = parsed.data;
  const prepared = await dependencies.repository.prepare({
    campaignKey: dependencies.config.campaignKey,
    email,
    emailFingerprint: launchFingerprint(dependencies.config.rateLimitSecret, "email", email),
    clientFingerprint: launchFingerprint(
      dependencies.config.rateLimitSecret,
      "client",
      input.clientIdentity || "unknown",
    ),
    newsletterOptIn,
    now: now.toISOString(),
    origin,
    requestType,
  });
  if (prepared.outcome === "campaign_closed") throw new LaunchAccessError("CAMPAIGN_CLOSED");
  if (prepared.outcome === "campaign_unavailable") throw new LaunchAccessError("REQUEST_UNAVAILABLE");
  if (prepared.outcome === "rate_limited") throw new LaunchAccessError("RATE_LIMITED");
  if (prepared.outcome === "newsletter_subscribed") return { status: "newsletter_subscribed" };
  if (prepared.outcome === "request_received") return { status: "request_received" };
  if (prepared.outcome === "already_requested") {
    return requestType === "newsletter_only"
      ? { status: "newsletter_subscribed" }
      : { status: "request_received" };
  }
  // Compatibility with an earlier prepared/outbox contract: a committed
  // registration is acknowledged, but this request never drains the outbox or
  // sends mail. Future notifications are a separate, explicitly operated flow.
  return { status: "request_received" };
}

export async function confirmLaunchAccess(
  token: string,
  dependencies: Pick<LaunchAccessServiceDependencies, "config" | "repository">,
  now: Date = new Date(),
): Promise<{ status: "email_confirmed" | "expired" }> {
  const verification = verifyLaunchConfirmationToken(token, dependencies.config.tokenSecret, now);
  if (verification.status === "expired") return { status: "expired" };
  if (
    verification.status !== "valid"
    || verification.payload.campaignKey !== dependencies.config.campaignKey
  ) throw new LaunchAccessError("INVALID_TOKEN");
  const result = await dependencies.repository.confirm({
    campaignKey: verification.payload.campaignKey,
    registrationId: verification.payload.registrationId,
    tokenVersion: verification.payload.tokenVersion,
    tokenNonce: verification.payload.nonce,
    now: now.toISOString(),
  });
  if (result === "expired") return { status: "expired" };
  if (result !== "email_confirmed") throw new LaunchAccessError("INVALID_TOKEN");
  return { status: "email_confirmed" };
}

export async function getPublicLaunchAccessState(
  dependencies: Pick<LaunchAccessServiceDependencies, "config" | "repository">,
  now: Date = new Date(),
): Promise<{ status: LaunchAccessPublicStatus }> {
  return { status: await dependencies.repository.publicState(dependencies.config.campaignKey, now) };
}
