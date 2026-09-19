import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicConfig } from "@/src/lib/publicConfig";

export interface BillingServerConfig {
  appBaseUrl: string;
  billingMode: "subscription_auto";
  mercadoPagoAccessToken: string;
  mercadoPagoWebhookSecret: string;
  supabaseServiceRoleKey: string;
}

export interface BillingDatabaseConfig {
  supabaseServiceRoleKey: string;
}

function clean(value: string | undefined): string {
  return value?.trim() || "";
}

function normalizedBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    const localDevelopment = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localDevelopment) return "";
    if (url.username || url.password || url.search || url.hash) return "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function getBillingServerConfig(): BillingServerConfig | null {
  const appBaseUrl = normalizedBaseUrl(clean(process.env.APP_BASE_URL));
  const billingMode = clean(process.env.MERCADO_PAGO_BILLING_MODE);
  const mercadoPagoAccessToken = clean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
  const mercadoPagoWebhookSecret = clean(process.env.MERCADO_PAGO_WEBHOOK_SECRET);
  const supabaseServiceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (
    !appBaseUrl
    || billingMode !== "subscription_auto"
    || mercadoPagoAccessToken.length < 20
    || mercadoPagoWebhookSecret.length < 32
    || supabaseServiceRoleKey.length < 20
    || !publicConfig.supabaseUrl
  ) return null;
  return {
    appBaseUrl,
    billingMode,
    mercadoPagoAccessToken,
    mercadoPagoWebhookSecret,
    supabaseServiceRoleKey,
  };
}

export function getBillingDatabaseConfig(): BillingDatabaseConfig | null {
  const supabaseServiceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (supabaseServiceRoleKey.length < 20 || !publicConfig.supabaseUrl) return null;
  return { supabaseServiceRoleKey };
}

export function requireBillingServerConfig(): BillingServerConfig {
  const config = getBillingServerConfig();
  if (!config) throw new BillingConfigurationError();
  return config;
}

export function requireBillingDatabaseConfig(): BillingDatabaseConfig {
  const config = getBillingDatabaseConfig();
  if (!config) throw new BillingConfigurationError();
  return config;
}

export function createBillingServiceClient(
  config: BillingDatabaseConfig = requireBillingDatabaseConfig(),
): SupabaseClient {
  return createClient(publicConfig.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class BillingConfigurationError extends Error {
  constructor() {
    super("BILLING_NOT_CONFIGURED");
    this.name = "BillingConfigurationError";
  }
}
