import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  getLaunchAccessRuntimeConfig,
  type LaunchAccessRuntimeConfig,
} from "@/src/server/launch/config";
import { readLaunchJsonBody } from "@/src/server/launch/http";
import {
  SupabaseLaunchAccessRepository,
  type LaunchAccessRepository,
  type PrepareLaunchAccessResult,
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

const config: LaunchAccessRuntimeConfig = {
  appBaseUrl: "https://example.com",
  campaignKey: "launch-20-v1",
  rateLimitSecret: "rate-limit-secret-that-is-at-least-32-bytes",
  supabaseServiceRoleKey: "service-role-key-that-is-long-enough",
  supabaseUrl: "https://project.supabase.co",
  tokenSecret: "confirmation-secret-that-is-at-least-32-bytes",
};

const prepared: PrepareLaunchAccessResult = {
  outcome: "request_received",
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
    const baseRequest = {
      email: "persona@example.com",
      locale: "en",
      newsletterOptIn: false,
      origin: "landing_launch",
      requestType: "waitlist",
    } as const;
    expect(launchAccessRequestSchema.safeParse(baseRequest).success).toBe(true);
    expect(launchAccessRequestSchema.safeParse({
      ...baseRequest,
      requestType: "newsletter_only",
      newsletterOptIn: true,
    }).success).toBe(true);
    expect(launchAccessRequestSchema.safeParse({
      ...baseRequest,
      requestType: "newsletter_only",
    }).success).toBe(false);
    expect(launchAccessRequestSchema.safeParse({ ...baseRequest, locale: "fr" }).success).toBe(false);

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
  it("acknowledges a waitlist request only after the repository commit", async () => {
    const repository = repositoryWith();
    await expect(requestLaunchAccess({
      email: " Persona@Example.com ",
      clientIdentity: "203.0.113.1|test",
      locale: "es",
      newsletterOptIn: false,
      origin: "landing_launch",
      requestType: "waitlist",
    }, {
      config,
      repository,
    }, now)).resolves.toEqual({ status: "request_received" });
    expect(repository.prepare).toHaveBeenCalledWith(expect.objectContaining({
      campaignKey: "launch-20-v1",
      email: "persona@example.com",
      newsletterOptIn: false,
      origin: "landing_launch",
      requestType: "waitlist",
      now: now.toISOString(),
    }));
  });

  it("persists newsletter-only only with explicit consent and no waitlist conversion", async () => {
    const repository = repositoryWith({ outcome: "newsletter_subscribed" });
    await expect(requestLaunchAccess({
      email: "persona@example.com",
      clientIdentity: "203.0.113.1|test",
      locale: "es",
      newsletterOptIn: true,
      origin: "landing_launch",
      requestType: "newsletter_only",
    }, {
      config,
      repository,
    }, now)).resolves.toEqual({ status: "newsletter_subscribed" });
    expect(repository.prepare).toHaveBeenCalledWith(expect.objectContaining({
      newsletterOptIn: true,
      requestType: "newsletter_only",
    }));
  });

  it.each([
    ["waitlist", false, "request_received"],
    ["newsletter_only", true, "newsletter_subscribed"],
  ] as const)("maps a duplicate %s registration idempotently", async (requestType, newsletterOptIn, status) => {
    const repository = repositoryWith({ outcome: "already_requested" });
    await expect(requestLaunchAccess({
      email: "persona@example.com",
      clientIdentity: "203.0.113.1|test",
      locale: "es",
      newsletterOptIn,
      origin: "landing_launch",
      requestType,
    }, {
      config,
      repository,
    }, now)).resolves.toEqual({ status });
    expect(repository.prepare).toHaveBeenCalledTimes(1);
  });

  it("rejects newsletter-only when optional marketing consent is not explicit", async () => {
    await expect(requestLaunchAccess({
      email: "persona@example.com",
      clientIdentity: "203.0.113.1|test",
      locale: "es",
      newsletterOptIn: false,
      origin: "landing_launch",
      requestType: "newsletter_only",
    }, {
      config,
      repository: repositoryWith(),
    }, now)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it.each([
    ["campaign_closed", "CAMPAIGN_CLOSED"],
    ["campaign_unavailable", "REQUEST_UNAVAILABLE"],
    ["rate_limited", "RATE_LIMITED"],
  ] as const)("maps %s without claiming or sending an email", async (outcome, code) => {
    await expect(requestLaunchAccess({
      email: "persona@example.com",
      clientIdentity: "203.0.113.1|test",
      locale: "es",
      newsletterOptIn: false,
      origin: "landing_launch",
      requestType: "waitlist",
    }, {
      config,
      repository: repositoryWith({ outcome }),
    }, now)).rejects.toMatchObject({ code });
  });
});

describe("launch access public state", () => {
  function repositoryForCampaign(data: Record<string, unknown>) {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    return new SupabaseLaunchAccessRepository(client);
  }

  it("reports full from accepted waitlist requests without depending on email delivery", async () => {
    const repository = repositoryForCampaign({
      state: "collecting",
      registration_enabled: true,
      newsletter_registration_enabled: true,
      email_delivery_enabled: false,
      total_slots: 20,
      accepted_requests: 20,
      starts_at: null,
      ends_at: null,
    });
    await expect(repository.publicState(config.campaignKey, now)).resolves.toBe("closed");
  });

  it("reports open while unique accepted requests remain below capacity", async () => {
    const repository = repositoryForCampaign({
      state: "collecting",
      registration_enabled: true,
      newsletter_registration_enabled: true,
      email_delivery_enabled: false,
      total_slots: 20,
      accepted_requests: 19,
      starts_at: null,
      ends_at: null,
    });
    await expect(repository.publicState(config.campaignKey, now)).resolves.toBe("open");
  });

  it.each([
    ["draft full campaign", { state: "draft", starts_at: null, newsletter_registration_enabled: true }],
    ["future full campaign", { state: "collecting", starts_at: "2026-10-01T00:00:00.000Z", newsletter_registration_enabled: true }],
    ["full campaign without newsletter capture", { state: "collecting", starts_at: null, newsletter_registration_enabled: false }],
  ])("reports unavailable for %s", async (_caseName, overrides) => {
    const fullCampaign = {
      state: "collecting",
      registration_enabled: true,
      newsletter_registration_enabled: true,
      email_delivery_enabled: false,
      total_slots: 20,
      accepted_requests: 20,
      starts_at: null,
      ends_at: null,
    };
    const repository = repositoryForCampaign({
      ...fullCampaign,
      ...overrides,
    });
    await expect(repository.publicState(config.campaignKey, now)).resolves.toBe("unavailable");
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
