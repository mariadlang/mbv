import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import type {
  ClaimedEmailOutboxRow,
  EmailOutboxPersistence,
} from "@/src/server/email/outbox";
import { FakeEmailTransport, type TransactionalEmailTransport } from "@/src/server/email/transport";
import {
  getLaunchAccessRuntimeConfig,
  type LaunchAccessRuntimeConfig,
} from "@/src/server/launch/config";
import { readLaunchJsonBody } from "@/src/server/launch/http";
import type {
  LaunchAccessRepository,
  PrepareLaunchAccessResult,
} from "@/src/server/launch/repository";
import {
  confirmLaunchAccess,
  requestLaunchAccess,
} from "@/src/server/launch/service";
import { launchAccessRequestSchema } from "@/src/server/launch/schema";
import {
  signLaunchConfirmationToken,
  verifyLaunchConfirmationToken,
} from "@/src/server/launch/token";

const now = new Date("2026-09-28T15:00:00.000Z");
const registrationId = "194929c3-56ce-48cf-bdda-8c2dcfb3e5a4";
const outboxId = "7ecf7056-3e0c-4906-af79-d25b33785232";
const claimToken = "405914f9-abf0-4577-bfc7-2eb233f630f5";

const config: LaunchAccessRuntimeConfig = {
  appBaseUrl: "https://example.com",
  campaignKey: "launch-20-v1",
  rateLimitSecret: "rate-limit-secret-that-is-at-least-32-bytes",
  supabaseServiceRoleKey: "service-role-key-that-is-long-enough",
  supabaseUrl: "https://project.supabase.co",
  tokenSecret: "confirmation-secret-that-is-at-least-32-bytes",
};

const prepared: PrepareLaunchAccessResult = {
  outcome: "prepared",
  registrationId,
  outboxId,
  recipientEmail: "persona@example.com",
  tokenNonce: "n".repeat(43),
  tokenVersion: 3,
  confirmationExpiresAt: "2026-09-29T15:00:00.000Z",
};

function repositoryWith(
  outcome: PrepareLaunchAccessResult = prepared,
): LaunchAccessRepository {
  return {
    prepare: vi.fn().mockResolvedValue(outcome),
    confirm: vi.fn().mockResolvedValue("email_confirmed"),
    publicState: vi.fn().mockResolvedValue("open"),
  };
}

function claimedRow(): ClaimedEmailOutboxRow {
  return {
    id: outboxId,
    userId: null,
    recipientKind: "user",
    recipientEmail: "persona@example.com",
    templateKey: "launch_confirmation",
    dedupeKey: `launch_confirmation:${registrationId}:3`,
    templateData: {
      campaign_key: "launch-20-v1",
      registration_id: registrationId,
      token_version: 3,
    },
    attemptCount: 1,
    createdAt: now.toISOString(),
    claimToken,
    claimExpiresAt: "2026-09-28T15:05:00.000Z",
  };
}

function persistence(): EmailOutboxPersistence {
  return {
    claimNext: vi.fn().mockResolvedValue(claimedRow()),
    isStillRelevant: vi.fn().mockResolvedValue(true),
    complete: vi.fn().mockResolvedValue(undefined),
  };
}

describe("launch access configuration and tokens", () => {
  it("fails closed until the server flag and every secret are valid", () => {
    const complete = {
      LAUNCH_ACCESS_ENABLED: "1",
      APP_BASE_URL: "https://example.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key-that-is-long-enough",
      LAUNCH_ACCESS_TOKEN_SECRET: "confirmation-secret-that-is-at-least-32-bytes",
      LAUNCH_ACCESS_RATE_LIMIT_SECRET: "rate-limit-secret-that-is-at-least-32-bytes",
    };
    expect(getLaunchAccessRuntimeConfig({ ...complete, LAUNCH_ACCESS_ENABLED: "0" })).toBeNull();
    expect(getLaunchAccessRuntimeConfig({ ...complete, LAUNCH_ACCESS_TOKEN_SECRET: "short" })).toBeNull();
    expect(getLaunchAccessRuntimeConfig(complete)).toMatchObject({
      campaignKey: "launch-20-v1",
      appBaseUrl: "https://example.com",
    });
  });

  it("accepts only small same-origin JSON requests", async () => {
    const valid = new NextRequest("https://example.com/api/launch-access/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://example.com" },
      body: JSON.stringify({ email: "persona@example.com" }),
    });
    await expect(readLaunchJsonBody(valid, config.appBaseUrl)).resolves.toEqual({
      email: "persona@example.com",
    });
    expect(launchAccessRequestSchema.safeParse({ email: "persona@example.com", locale: "en" }).success).toBe(true);
    expect(launchAccessRequestSchema.safeParse({ email: "persona@example.com", locale: "fr" }).success).toBe(false);

    const crossSite = new NextRequest("https://example.com/api/launch-access/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
      body: "{}",
    });
    await expect(readLaunchJsonBody(crossSite, config.appBaseUrl)).rejects.toMatchObject({
      code: "REQUEST_FORBIDDEN",
    });

    const tooLarge = new NextRequest("https://example.com/api/launch-access/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "4097",
        Origin: "https://example.com",
      },
      body: "{}",
    });
    await expect(readLaunchJsonBody(tooLarge, config.appBaseUrl)).rejects.toMatchObject({
      code: "REQUEST_TOO_LARGE",
    });
  });

  it("rejects a modified or expired signed confirmation token", () => {
    const token = signLaunchConfirmationToken({
      v: 1,
      campaignKey: config.campaignKey,
      registrationId,
      tokenVersion: 3,
      nonce: "n".repeat(43),
      expiresAt: now.getTime() + 60_000,
    }, config.tokenSecret);
    expect(verifyLaunchConfirmationToken(token, config.tokenSecret, now).status).toBe("valid");
    expect(verifyLaunchConfirmationToken(`${token.slice(0, -1)}x`, config.tokenSecret, now).status).toBe("invalid");
    expect(verifyLaunchConfirmationToken(token, config.tokenSecret, new Date(now.getTime() + 60_001)).status).toBe("expired");
  });
});

describe("launch access request service", () => {
  it("returns success only after the isolated outbox row is accepted", async () => {
    const emailPersistence = persistence();
    const transport = new FakeEmailTransport();
    await expect(requestLaunchAccess({
      email: " Persona@Example.com ",
      clientIdentity: "203.0.113.1|test",
      locale: "es",
    }, {
      client: {} as SupabaseClient,
      config,
      createEmailPersistence: (id) => {
        expect(id).toBe(outboxId);
        return emailPersistence;
      },
      repository: repositoryWith(),
      supportEmail: "soporte@example.com",
      transport,
      allowTestTransport: true,
    }, now)).resolves.toEqual({ status: "confirmation_pending" });
    expect(transport.messages).toHaveLength(1);
    expect(transport.messages[0]?.text).toContain("Confirmar tu dirección no asigna todavía un cupo ni activa Premium");
    expect(transport.messages[0]?.text).toContain("https://example.com/launch-access/confirm#token=");
    expect(emailPersistence.complete).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: "accepted",
      providerMessageId: "fake-1",
    }));
  });

  it("renders the launch confirmation email in the requested English locale", async () => {
    const transport = new FakeEmailTransport();
    await requestLaunchAccess({
      email: "persona@example.com",
      clientIdentity: "203.0.113.1|test",
      locale: "en",
    }, {
      client: {} as SupabaseClient,
      config,
      createEmailPersistence: () => persistence(),
      repository: repositoryWith(),
      supportEmail: "support@example.com",
      transport,
      allowTestTransport: true,
    }, now);

    expect(transport.messages).toHaveLength(1);
    expect(transport.messages[0]?.subject).toBe("Confirm your email for launch access");
    expect(transport.messages[0]?.text).toContain("Confirming your address does not assign a spot or activate Premium yet");
    expect(transport.messages[0]?.html).toContain('<html lang="en">');
    expect(transport.messages[0]?.text).toContain("Support: support@example.com");
  });

  it("does not report success when the provider rejects delivery", async () => {
    const transport: TransactionalEmailTransport = {
      name: "failing-live",
      mode: "live",
      send: vi.fn().mockRejectedValue(new Error("provider detail")),
    };
    await expect(requestLaunchAccess({
      email: "persona@example.com",
      clientIdentity: "203.0.113.1|test",
      locale: "es",
    }, {
      client: {} as SupabaseClient,
      config,
      createEmailPersistence: () => persistence(),
      repository: repositoryWith(),
      supportEmail: "soporte@example.com",
      transport,
    }, now)).rejects.toMatchObject({ code: "REQUEST_UNAVAILABLE" });
  });

  it.each([
    ["campaign_closed", "CAMPAIGN_CLOSED"],
    ["campaign_unavailable", "REQUEST_UNAVAILABLE"],
    ["rate_limited", "RATE_LIMITED"],
  ] as const)("maps %s without claiming or sending an email", async (outcome, code) => {
    const transport = new FakeEmailTransport();
    const createEmailPersistence = vi.fn();
    await expect(requestLaunchAccess({
      email: "persona@example.com",
      clientIdentity: "203.0.113.1|test",
      locale: "es",
    }, {
      client: {} as SupabaseClient,
      config,
      createEmailPersistence,
      repository: repositoryWith({ outcome }),
      supportEmail: "soporte@example.com",
      transport,
      allowTestTransport: true,
    }, now)).rejects.toMatchObject({ code });
    expect(createEmailPersistence).not.toHaveBeenCalled();
    expect(transport.messages).toHaveLength(0);
  });
});

describe("launch email confirmation", () => {
  it("confirms the email through the repository without allocating a grant", async () => {
    const repository = repositoryWith();
    const token = signLaunchConfirmationToken({
      v: 1,
      campaignKey: config.campaignKey,
      registrationId,
      tokenVersion: 3,
      nonce: "n".repeat(43),
      expiresAt: now.getTime() + 60_000,
    }, config.tokenSecret);
    await expect(confirmLaunchAccess(token, { config, repository }, now)).resolves.toEqual({
      status: "email_confirmed",
    });
    expect(repository.confirm).toHaveBeenCalledWith({
      campaignKey: config.campaignKey,
      registrationId,
      tokenVersion: 3,
      tokenNonce: "n".repeat(43),
      now: now.toISOString(),
    });
  });
});
