import { createHash } from "node:crypto";

export const BETA_PROJECT_URL = "https://tvdnxefyduycvrakjspv.supabase.co";
type Environment = Record<string, string | undefined>;

export function betaEnabled(env: Environment = process.env) {
  return env.MBV_CLOSED_BETA === "1" || env.NEXT_PUBLIC_MBV_CLOSED_BETA === "1";
}

// An incomplete configuration always keeps the pilot closed. Email hashes are
// server-only identifiers, not credentials; authentication still belongs to Auth.
export function betaPolicy(env: Environment = process.env, now = Date.now()) {
  const denied = { allowed: false, endsAt: 0, emails: [] as string[] };
  if (env.MBV_CLOSED_BETA !== "1" || env.NEXT_PUBLIC_MBV_CLOSED_BETA !== "1"
    || env.NEXT_PUBLIC_MBV_E2E_ACCESS !== "0"
    || env.NEXT_PUBLIC_SUPABASE_URL !== BETA_PROJECT_URL
    || env.MBV_BETA_PAUSED !== "0") return denied;
  const startsAt = Date.parse(env.MBV_BETA_STARTS_AT ?? "");
  const endsAt = Date.parse(env.MBV_BETA_ENDS_AT ?? "");
  const emails = (env.MBV_BETA_EMAIL_SHA256 ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt
    || endsAt - startsAt > 7 * 86_400_000 || now < startsAt || now >= endsAt
    || emails.length < 1 || emails.length > 5 || new Set(emails).size !== emails.length
    || emails.some((s) => !/^[a-f0-9]{64}$/.test(s))) return denied;
  return { allowed: true, endsAt, emails };
}

export function assertBetaIdentity(user: { email?: string; email_confirmed_at?: string }, origin: string, env: Environment = process.env, now = Date.now()) {
  const policy = betaPolicy(env, now);
  const emailHash = createHash("sha256").update((user.email ?? "").trim().toLowerCase()).digest("hex");
  if (!policy.allowed || !user.email_confirmed_at || !policy.emails.includes(emailHash)
    || !env.APP_BASE_URL || origin !== env.APP_BASE_URL) {
    throw Response.json({ error: "BETA_UNAVAILABLE" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
}

export function assertBetaFreeAccess(row: Record<string, unknown> | null | undefined, userId: string) {
  if (!row || row.user_id !== userId || row.role !== "user" || row.access_status !== "free"
    || row.subscription_status !== "none" || row.premium_source != null) {
    throw Response.json({ error: "BETA_FREE_ACCOUNT_REQUIRED" }, { status: 403 });
  }
}

export function betaBlockedPath(pathname: string) {
  return ["/api/billing", "/api/commerce", "/api/launch-access", "/api/integrations", "/api/platform"]
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
