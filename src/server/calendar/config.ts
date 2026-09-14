import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicConfig } from "@/src/lib/publicConfig";

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export interface CalendarServerConfig {
  appBaseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  encryptionKey: string;
  supabaseServiceRoleKey: string;
}

function clean(value: string | undefined) {
  return value?.trim() || "";
}

export function isStrongCalendarEncryptionKey(value: string) {
  const secret = clean(value);
  if (secret.length < 32) return false;
  try {
    const normalized = secret.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
    if (decoded.length >= 32) return true;
  } catch {
    // A long high-entropy plain-text secret is also accepted.
  }
  return new TextEncoder().encode(secret).byteLength >= 32;
}

export function getCalendarServerConfig(): CalendarServerConfig | null {
  const appBaseUrl = clean(process.env.APP_BASE_URL).replace(/\/$/, "");
  const googleClientId = clean(process.env.GOOGLE_CALENDAR_CLIENT_ID);
  const googleClientSecret = clean(process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
  const encryptionKey = clean(process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY);
  const supabaseServiceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!appBaseUrl || !googleClientId || !googleClientSecret || !isStrongCalendarEncryptionKey(encryptionKey) || !supabaseServiceRoleKey || !publicConfig.supabaseUrl) return null;
  return { appBaseUrl, googleClientId, googleClientSecret, encryptionKey, supabaseServiceRoleKey };
}

export function requireCalendarServerConfig(): CalendarServerConfig {
  const config = getCalendarServerConfig();
  if (!config) throw new CalendarConfigurationError();
  return config;
}

export function createCalendarServiceClient(config = requireCalendarServerConfig()): SupabaseClient {
  return createClient(publicConfig.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class CalendarConfigurationError extends Error {
  constructor() {
    super("CALENDAR_NOT_CONFIGURED");
    this.name = "CalendarConfigurationError";
  }
}
