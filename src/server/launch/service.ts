import type { SupabaseClient } from "@supabase/supabase-js";
import {
  processNextTransactionalEmail,
  type EmailOutboxPersistence,
} from "@/src/server/email/outbox";
import { renderTransactionalEmail } from "@/src/server/email/templates";
import type { TransactionalEmailTransport } from "@/src/server/email/transport";
import type { LaunchAccessRuntimeConfig } from "@/src/server/launch/config";
import {
  LaunchAccessError,
  launchAccessEmailSchema,
  type LaunchAccessLocale,
  type LaunchAccessPublicStatus,
} from "@/src/server/launch/schema";
import type { LaunchAccessRepository } from "@/src/server/launch/repository";
import {
  launchFingerprint,
  signLaunchConfirmationToken,
  verifyLaunchConfirmationToken,
} from "@/src/server/launch/token";

export interface LaunchAccessServiceDependencies {
  client: SupabaseClient;
  config: LaunchAccessRuntimeConfig;
  createEmailPersistence: (outboxId: string) => EmailOutboxPersistence;
  repository: LaunchAccessRepository;
  supportEmail: string;
  transport: TransactionalEmailTransport;
  /** Unit tests may explicitly opt into the fake transport. */
  allowTestTransport?: boolean;
}

export interface RequestLaunchAccessInput {
  email: string;
  clientIdentity: string;
  locale: LaunchAccessLocale;
}

function confirmationUrl(baseUrl: string, token: string): string {
  const url = new URL("/launch-access/confirm", baseUrl);
  // The bearer stays in the fragment so it is not sent in HTTP requests,
  // access logs or referrer headers. A confirmation UI can read it and POST it.
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

export async function requestLaunchAccess(
  input: RequestLaunchAccessInput,
  dependencies: LaunchAccessServiceDependencies,
  now: Date = new Date(),
): Promise<{ status: "confirmation_pending" }> {
  const parsedEmail = launchAccessEmailSchema.safeParse(input.email);
  if (!parsedEmail.success) throw new LaunchAccessError("INVALID_EMAIL");
  const email = parsedEmail.data;
  const prepared = await dependencies.repository.prepare({
    campaignKey: dependencies.config.campaignKey,
    email,
    emailFingerprint: launchFingerprint(dependencies.config.rateLimitSecret, "email", email),
    clientFingerprint: launchFingerprint(
      dependencies.config.rateLimitSecret,
      "client",
      input.clientIdentity || "unknown",
    ),
    now: now.toISOString(),
  });
  if (prepared.outcome === "campaign_closed") throw new LaunchAccessError("CAMPAIGN_CLOSED");
  if (prepared.outcome === "campaign_unavailable") throw new LaunchAccessError("REQUEST_UNAVAILABLE");
  if (prepared.outcome === "rate_limited") throw new LaunchAccessError("RATE_LIMITED");

  const expiresAt = new Date(prepared.confirmationExpiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    throw new LaunchAccessError("REQUEST_UNAVAILABLE");
  }
  const token = signLaunchConfirmationToken({
    v: 1,
    campaignKey: dependencies.config.campaignKey,
    registrationId: prepared.registrationId,
    tokenVersion: prepared.tokenVersion,
    nonce: prepared.tokenNonce,
    expiresAt,
  }, dependencies.config.tokenSecret);
  const url = confirmationUrl(dependencies.config.appBaseUrl, token);
  const result = await processNextTransactionalEmail({
    client: dependencies.client,
    transport: dependencies.transport,
    persistence: dependencies.createEmailPersistence(prepared.outboxId),
    allowTestTransport: dependencies.allowTestTransport,
    now,
    render: (row) => {
      if (row.id !== prepared.outboxId || row.templateKey !== "launch_confirmation") {
        throw new Error("LAUNCH_EMAIL_OUTBOX_MISMATCH");
      }
      return renderTransactionalEmail({
        kind: "launch_confirmation",
        confirmationUrl: url,
        locale: input.locale,
        supportEmail: dependencies.supportEmail,
      });
    },
  });
  if (result.status !== "accepted") throw new LaunchAccessError("REQUEST_UNAVAILABLE");
  return { status: "confirmation_pending" };
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
