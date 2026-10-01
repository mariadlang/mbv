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
import { launchFingerprint } from "@/src/server/launch/token";

export interface LaunchAccessServiceDependencies {
  config: LaunchAccessRuntimeConfig;
  repository: LaunchAccessRepository;
}

export interface RequestLaunchAccessInput {
  email: string;
  requestId: string;
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
    requestId: input.requestId,
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
  const { email, locale, newsletterOptIn, origin, requestId, requestType } = parsed.data;
  const prepared = await dependencies.repository.prepare({
    campaignKey: dependencies.config.campaignKey,
    email,
    clientFingerprint: launchFingerprint(
      dependencies.config.rateLimitSecret,
      "client",
      input.clientIdentity || "unknown",
    ),
    requestFingerprint: launchFingerprint(
      dependencies.config.rateLimitSecret,
      "request",
      requestId,
    ),
    payloadFingerprint: launchFingerprint(
      dependencies.config.rateLimitSecret,
      "payload",
      JSON.stringify([email, locale, requestType, newsletterOptIn, origin]),
    ),
    newsletterOptIn,
    now: now.toISOString(),
    origin,
    requestType,
  });
  if (prepared.outcome === "campaign_closed") throw new LaunchAccessError("CAMPAIGN_CLOSED");
  if (prepared.outcome === "campaign_unavailable") throw new LaunchAccessError("REQUEST_UNAVAILABLE");
  if (prepared.outcome === "rate_limited") throw new LaunchAccessError("RATE_LIMITED");
  if (prepared.outcome === "request_mismatch") throw new LaunchAccessError("INVALID_REQUEST");
  if (prepared.outcome === "newsletter_subscribed") return { status: "newsletter_subscribed" };
  if (prepared.outcome === "request_received") return { status: "request_received" };
  throw new LaunchAccessError("REQUEST_UNAVAILABLE");
}

export async function getPublicLaunchAccessState(
  dependencies: Pick<LaunchAccessServiceDependencies, "config" | "repository">,
  now: Date = new Date(),
): Promise<{ status: LaunchAccessPublicStatus }> {
  return { status: await dependencies.repository.publicState(dependencies.config.campaignKey, now) };
}
