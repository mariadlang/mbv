import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface LaunchAccessRuntimeConfig {
  appBaseUrl: string;
  campaignKey: string;
  rateLimitSecret: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
}

type LaunchEnvironment = Readonly<Record<string, string | undefined>>;

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function strongSecret(value: string): boolean {
  return new TextEncoder().encode(value).byteLength >= 32;
}

function normalizedBaseUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !local) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizedSupabaseUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !local) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * The campaign is disabled unless every server-only dependency is explicit and
 * valid. Public feature flags never authorize database writes or email sends.
 */
export function getLaunchAccessRuntimeConfig(
  environment: LaunchEnvironment = process.env,
): LaunchAccessRuntimeConfig | null {
  if (clean(environment.LAUNCH_ACCESS_ENABLED) !== "1") return null;
  const appBaseUrl = normalizedBaseUrl(clean(environment.APP_BASE_URL));
  const supabaseUrl = normalizedSupabaseUrl(clean(environment.NEXT_PUBLIC_SUPABASE_URL));
  const supabaseServiceRoleKey = clean(environment.SUPABASE_SERVICE_ROLE_KEY);
  const rateLimitSecret = clean(environment.LAUNCH_ACCESS_RATE_LIMIT_SECRET);
  const campaignKey = clean(environment.LAUNCH_ACCESS_CAMPAIGN_KEY) || "launch-20-v1";
  if (
    !appBaseUrl
    || !supabaseUrl
    || supabaseServiceRoleKey.length < 20
    || !strongSecret(rateLimitSecret)
    || !/^[a-z0-9][a-z0-9_-]{2,63}$/.test(campaignKey)
  ) return null;
  return {
    appBaseUrl,
    campaignKey,
    rateLimitSecret,
    supabaseServiceRoleKey,
    supabaseUrl,
  };
}

export function createLaunchAccessServiceClient(config: LaunchAccessRuntimeConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
