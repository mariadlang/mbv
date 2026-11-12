import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertBetaFreeAccess, assertBetaIdentity, betaBlockedPath, betaEnabled, betaPolicy, BETA_PROJECT_URL } from "@/src/server/beta/policy";
import { getBillingDatabaseConfig, getBillingServerConfig } from "@/src/server/billing/config";

const hash = (email: string) => createHash("sha256").update(email).digest("hex");
const now = Date.parse("2026-11-09T17:00:00Z");
const env = {
  MBV_CLOSED_BETA: "1", NEXT_PUBLIC_MBV_CLOSED_BETA: "1", NEXT_PUBLIC_MBV_E2E_ACCESS: "0",
  NEXT_PUBLIC_SUPABASE_URL: BETA_PROJECT_URL, MBV_BETA_PAUSED: "0",
  MBV_BETA_STARTS_AT: "2026-11-09T00:00:00Z", MBV_BETA_ENDS_AT: "2026-11-16T00:00:00Z",
  MBV_BETA_EMAIL_SHA256: hash("tester@example.test"), APP_BASE_URL: "https://beta.example.test",
};
const user = { email: "Tester@example.test", email_confirmed_at: "2026-11-09T00:00:00Z" };
afterEach(() => vi.unstubAllEnvs());

describe("closed beta server policy", () => {
  it("is inactive for the existing candidate and accepts a verified invited identity only within the window", () => {
    expect(betaEnabled({})).toBe(false);
    expect(betaPolicy(env, now).allowed).toBe(true);
    expect(() => assertBetaIdentity(user, env.APP_BASE_URL, env, now)).not.toThrow();
  });
  it.each([
    { MBV_BETA_PAUSED: "1" }, { MBV_BETA_PAUSED: undefined },
    { NEXT_PUBLIC_MBV_CLOSED_BETA: "0" }, { MBV_CLOSED_BETA: "0" },
    { NEXT_PUBLIC_MBV_E2E_ACCESS: "1" }, { NEXT_PUBLIC_MBV_E2E_ACCESS: undefined },
    { NEXT_PUBLIC_SUPABASE_URL: "https://production.example.test" },
    { MBV_BETA_STARTS_AT: "invalid" }, { MBV_BETA_STARTS_AT: "2026-11-10T00:00:00Z" },
    { MBV_BETA_ENDS_AT: "2026-11-09T16:00:00Z" }, { MBV_BETA_ENDS_AT: "2026-11-17T00:00:00Z" },
    { MBV_BETA_EMAIL_SHA256: "" }, { MBV_BETA_EMAIL_SHA256: "not-a-hash" },
    { MBV_BETA_EMAIL_SHA256: `${hash("tester@example.test")},${hash("tester@example.test")}` },
    { MBV_BETA_EMAIL_SHA256: Array.from({ length: 6 }, (_, i) => hash(`test${i}`)).join(",") },
  ])("fails closed with unsafe/incomplete configuration %j", (override) => {
    expect(betaPolicy({ ...env, ...override }, now).allowed).toBe(false);
    expect(() => assertBetaIdentity(user, env.APP_BASE_URL, { ...env, ...override }, now)).toThrow();
  });
  it("rejects an unverified email, a different identity and a preview origin", () => {
    expect(() => assertBetaIdentity({ ...user, email_confirmed_at: undefined }, env.APP_BASE_URL, env, now)).toThrow();
    expect(() => assertBetaIdentity({ ...user, email: "other@example.test" }, env.APP_BASE_URL, env, now)).toThrow();
    expect(() => assertBetaIdentity(user, "https://preview.example.test", env, now)).toThrow();
  });
  it("accepts five distinct invitations, denies at the exact end and does not mutate account permissions", () => {
    expect(betaPolicy({ ...env, MBV_BETA_EMAIL_SHA256: Array.from({ length: 5 }, (_, i) => hash(`test${i}`)).join(",") }, now).allowed).toBe(true);
    expect(betaPolicy(env, Date.parse(env.MBV_BETA_ENDS_AT)).allowed).toBe(false);
    const free = Object.freeze({ user_id: "a", role: "user", access_status: "free", subscription_status: "none", premium_source: null });
    expect(() => assertBetaFreeAccess(free, "a")).not.toThrow();
    for (const override of [{ role: "superadmin" }, { access_status: "legacy_premium" }, { subscription_status: "active" }, { premium_source: "legacy" }, { user_id: "b" }]) {
      expect(() => assertBetaFreeAccess({ ...free, ...override }, "a")).toThrow();
    }
  });
  it("blocks checkout, cron, webhook and commercial activation while leaving planner and recovery routes available", () => {
    for (const path of ["/api/billing/checkout", "/api/billing/maintenance", "/api/billing/webhook", "/api/commerce/activity", "/api/launch-access/confirm", "/api/integrations/google-calendar"]) expect(betaBlockedPath(path)).toBe(true);
    for (const path of ["/api/beta/access", "/app/today", "/forgot-password", "/login"]) expect(betaBlockedPath(path)).toBe(false);
    vi.stubEnv("MBV_CLOSED_BETA", "1");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "accidental-secret-must-not-enable-billing");
    expect(getBillingServerConfig()).toBeNull();
    expect(getBillingDatabaseConfig()).toBeNull();
  });
});
