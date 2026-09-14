import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEventInput, CalendarEventStatus } from "@/src/domain/calendar";
import { decryptServerSecret, encryptServerSecret } from "@/src/server/calendar/crypto";
import type { CalendarServerConfig } from "@/src/server/calendar/config";

export interface CalendarIntegrationRow {
  id: string;
  user_id: string;
  account_id: string;
  email: string;
  status: "connecting" | "connected" | "reconnect_required" | "disconnected";
  connection_generation?: string | null;
  selection_generation: string;
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string;
  token_expires_at: string | null;
  scopes: string[];
  last_synced_at: string | null;
  last_error_code: string | null;
}

export interface ConnectedCalendarRow {
  id: string;
  integration_id: string;
  user_id: string;
  external_calendar_id: string;
  name: string;
  timezone: string | null;
  color: string | null;
  is_visible: boolean;
  is_writable: boolean;
  is_default: boolean;
  sync_token: string | null;
  channel_id: string | null;
  channel_resource_id: string | null;
  channel_token_hash: string | null;
  channel_expires_at: string | null;
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: "freeBusyReader" | "reader" | "writer" | "owner";
  timeZone?: string;
  backgroundColor?: string;
  deleted?: boolean;
}

export interface GoogleEventResource {
  id: string;
  etag?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  iCalUID?: string;
  updated?: string;
  recurringEventId?: string;
  recurrence?: string[];
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

export interface NormalizedGoogleEvent {
  externalEventId: string;
  localEventId?: string;
  iCalUid?: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone: string;
  allDay: boolean;
  recurrence: string[];
  recurringEventId?: string;
  status: CalendarEventStatus;
  etag?: string;
  googleUpdatedAt?: string;
  origin: "mbv" | "google";
}

export class GoogleCalendarApiError extends Error {
  constructor(public status: number, public code: string, message = code) {
    super(message);
    this.name = "GoogleCalendarApiError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: { message?: string; status?: string; errors?: Array<{ reason?: string }> } | string };
  if (!response.ok) {
    const remoteMessage = typeof data.error === "string" ? data.error : data.error?.message;
    const remoteReason = typeof data.error === "string" ? undefined : data.error?.errors?.[0]?.reason;
    throw new GoogleCalendarApiError(response.status, response.status === 410 ? "SYNC_TOKEN_GONE" : response.status === 412 ? "ETAG_CONFLICT" : response.status === 409 && remoteReason === "duplicate" ? "GOOGLE_EVENT_DUPLICATE" : response.status === 429 ? "RATE_LIMITED" : response.status === 401 ? "GOOGLE_UNAUTHORIZED" : "GOOGLE_REQUEST_FAILED", remoteMessage);
  }
  return data;
}

export async function exchangeGoogleAuthorizationCode(config: CalendarServerConfig, code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: `${config.appBaseUrl}/api/integrations/google-calendar/callback`,
  });
  return readJson<GoogleTokenResponse>(await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }));
}

async function refreshGoogleAccessToken(config: CalendarServerConfig, refreshToken: string) {
  const body = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return readJson<GoogleTokenResponse>(await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }));
}

export async function accessTokenForIntegration(config: CalendarServerConfig, service: SupabaseClient, integration: CalendarIntegrationRow, forceRefresh = false) {
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
  if (!forceRefresh && integration.access_token_ciphertext && expiresAt > Date.now() + 60_000) {
    return decryptServerSecret(integration.access_token_ciphertext, config.encryptionKey);
  }
  try {
    const refreshToken = await decryptServerSecret(integration.refresh_token_ciphertext, config.encryptionKey);
    const refreshed = await refreshGoogleAccessToken(config, refreshToken);
    const nextExpiry = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
    const encryptedAccess = await encryptServerSecret(refreshed.access_token, config.encryptionKey);
    let update = service.from("calendar_integrations").update({
      access_token_ciphertext: encryptedAccess,
      token_expires_at: nextExpiry,
      last_error_code: null,
    }).eq("id", integration.id).eq("account_id", integration.account_id).eq("selection_generation", integration.selection_generation);
    if (integration.connection_generation) update = update.eq("connection_generation", integration.connection_generation);
    const { data: updated, error } = await update.select("id").maybeSingle();
    if (error) throw error;
    if (!updated) throw new GoogleCalendarApiError(409, "CALENDAR_CONNECTION_CHANGED");
    integration.access_token_ciphertext = encryptedAccess;
    integration.token_expires_at = nextExpiry;
    return refreshed.access_token;
  } catch (error) {
    let update = service.from("calendar_integrations").update({ status: "reconnect_required", last_error_code: "TOKEN_REFRESH_FAILED" }).eq("id", integration.id).eq("account_id", integration.account_id).eq("selection_generation", integration.selection_generation);
    if (integration.connection_generation) update = update.eq("connection_generation", integration.connection_generation);
    await update;
    if (error instanceof GoogleCalendarApiError && error.code === "CALENDAR_CONNECTION_CHANGED") throw error;
    if (error instanceof GoogleCalendarApiError) throw new GoogleCalendarApiError(401, "RECONNECT_REQUIRED");
    throw error;
  }
}

export async function googleApiJson<T>(accessToken: string, url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return readJson<T>(await fetch(url, { ...init, headers }));
}

export async function googleApiJsonForIntegration<T>(
  config: CalendarServerConfig,
  service: SupabaseClient,
  integration: CalendarIntegrationRow,
  url: string,
  init: RequestInit = {},
) {
  let accessToken = await accessTokenForIntegration(config, service, integration);
  try {
    return await googleApiJson<T>(accessToken, url, init);
  } catch (error) {
    if (!(error instanceof GoogleCalendarApiError) || error.status !== 401) throw error;
    accessToken = await accessTokenForIntegration(config, service, integration, true);
    try {
      return await googleApiJson<T>(accessToken, url, init);
    } catch (retryError) {
      if (retryError instanceof GoogleCalendarApiError && retryError.status === 401) {
        let reconnect = service.from("calendar_integrations").update({ status: "reconnect_required", last_error_code: "GOOGLE_UNAUTHORIZED" })
          .eq("id", integration.id).eq("account_id", integration.account_id).eq("selection_generation", integration.selection_generation);
        if (integration.connection_generation) reconnect = reconnect.eq("connection_generation", integration.connection_generation);
        await reconnect;
        throw new GoogleCalendarApiError(401, "RECONNECT_REQUIRED");
      }
      throw retryError;
    }
  }
}

export function googleAuthorizationUrl(config: CalendarServerConfig, state: string, codeChallenge: string, scopes: readonly string[]) {
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: `${config.appBaseUrl}/api/integrations/google-calendar/callback`,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function googleUserInfo(accessToken: string) {
  return googleApiJson<{ sub: string; email: string }>(accessToken, "https://openidconnect.googleapis.com/v1/userinfo");
}

export async function googleCalendarList(accessToken: string) {
  const calendars: GoogleCalendarListEntry[] = [];
  let pageToken = "";
  do {
    const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await googleApiJson<{ items?: GoogleCalendarListEntry[]; nextPageToken?: string }>(accessToken, url.toString());
    calendars.push(...(page.items ?? []).filter((calendar) => !calendar.deleted));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return calendars;
}

function previousDateKey(exclusiveEnd: string) {
  const date = new Date(`${exclusiveEnd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function normalizeDateTime(value: string | undefined, timezone: string) {
  if (!value) return {};
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    const localMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
    return localMatch ? { date: localMatch[1], time: localMatch[2] } : {};
  }
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return {};
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = part("hour");
  const minute = part("minute");
  if (!year || !month || !day || !hour || !minute) return {};
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}`, instant: instant.toISOString() };
}

export function normalizeGoogleEvent(resource: GoogleEventResource, fallbackTimezone: string, expectedUserHash?: string): NormalizedGoogleEvent | null {
  const allDay = Boolean(resource.start?.date);
  const requestedTimezone = (resource.start?.timeZone ?? resource.end?.timeZone ?? fallbackTimezone) || "UTC";
  let timezone = requestedTimezone;
  try { new Intl.DateTimeFormat("en", { timeZone: requestedTimezone }).format(); } catch { timezone = "UTC"; }
  const start = allDay ? { date: resource.start?.date } : normalizeDateTime(resource.start?.dateTime, timezone);
  const end = allDay ? { date: resource.end?.date ? previousDateKey(resource.end.date) : resource.start?.date } : normalizeDateTime(resource.end?.dateTime, timezone);
  const startDate = start.date ?? resource.start?.date ?? resource.end?.date ?? "";
  if (!resource.id || !startDate) return null;
  const candidateLocalEventId = resource.extendedProperties?.private?.mbvLocalEventId;
  const ownedByMbv = Boolean(expectedUserHash && candidateLocalEventId && isOwnedGoogleEvent(resource, candidateLocalEventId, expectedUserHash));
  return {
    externalEventId: resource.id,
    ...(ownedByMbv ? { localEventId: candidateLocalEventId } : {}),
    iCalUid: resource.iCalUID,
    title: resource.summary?.trim() || "(Sin título)",
    description: resource.description,
    startAt: "instant" in start ? start.instant : undefined,
    endAt: "instant" in end ? end.instant : undefined,
    startDate,
    endDate: end.date && end.date !== startDate ? end.date : undefined,
    startTime: "time" in start ? start.time : undefined,
    endTime: "time" in end ? end.time : undefined,
    timezone,
    allDay,
    recurrence: resource.recurrence ?? [],
    recurringEventId: resource.recurringEventId,
    status: resource.status ?? "confirmed",
    etag: resource.etag,
    googleUpdatedAt: resource.updated,
    origin: ownedByMbv ? "mbv" : "google",
  };
}

function nextDateKey(inclusiveEnd: string) {
  const date = new Date(`${inclusiveEnd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function buildGoogleEventResource(input: CalendarEventInput, userHash: string): GoogleEventResource {
  const base: GoogleEventResource = {
    id: googleEventIdForLocal(input.localEventId),
    summary: input.title,
    description: input.description,
    extendedProperties: { private: { mbvLocalEventId: input.localEventId, mbvOrigin: "mbv", mbvUser: userHash } },
  };
  if (input.allDay) {
    base.start = { date: input.startDate };
    base.end = { date: nextDateKey(input.endDate ?? input.startDate) };
  } else {
    base.start = { dateTime: `${input.startDate}T${input.startTime ?? "09:00"}:00`, timeZone: input.timezone };
    base.end = { dateTime: `${input.endDate ?? input.startDate}T${input.endTime ?? input.startTime ?? "10:00"}:00`, timeZone: input.timezone };
  }
  return base;
}

export function googleEventIdForLocal(localEventId: string) {
  const safe = localEventId.toLowerCase().replace(/[^a-v0-9]/g, "");
  return `mbv${safe}`.slice(0, 100);
}

export function isOwnedGoogleEvent(resource: GoogleEventResource, localEventId: string, userHash: string) {
  const metadata = resource.extendedProperties?.private;
  return metadata?.mbvOrigin === "mbv"
    && metadata.mbvLocalEventId === localEventId
    && metadata.mbvUser === userHash;
}

export function googleEventContentMatchesInput(resource: GoogleEventResource, input: CalendarEventInput, userHash: string) {
  if (!isOwnedGoogleEvent(resource, input.localEventId, userHash)) return false;
  const normalized = normalizeGoogleEvent(resource, input.timezone, userHash);
  if (!normalized || normalized.status !== "confirmed" || normalized.recurrence.length > 0) return false;
  if (normalized.title !== input.title || (normalized.description ?? "") !== (input.description ?? "")) return false;
  if (normalized.startDate !== input.startDate || (normalized.endDate ?? normalized.startDate) !== (input.endDate ?? input.startDate)) return false;
  if (normalized.allDay !== input.allDay) return false;
  if (input.allDay) return true;
  return normalized.startTime === input.startTime
    && normalized.endTime === input.endTime
    && normalized.timezone === input.timezone;
}

export function requireStoredGoogleEtag(storedEtag: string | null | undefined, clientEtag: string | null | undefined) {
  if (!storedEtag || !clientEtag || storedEtag !== clientEtag) throw new GoogleCalendarApiError(409, "ETAG_CONFLICT");
  return storedEtag;
}
