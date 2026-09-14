import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent, CalendarIntegrationSnapshot, ConnectedCalendar } from "@/src/domain/calendar";
import { randomOpaqueValue, sha256 } from "@/src/server/calendar/crypto";
import type { CalendarServerConfig } from "@/src/server/calendar/config";
import {
  accessTokenForIntegration,
  googleApiJson,
  GoogleCalendarApiError,
  normalizeGoogleEvent,
  type CalendarIntegrationRow,
  type ConnectedCalendarRow,
  type GoogleEventResource,
} from "@/src/server/calendar/googleApi";

type CalendarEventRow = {
  id: string;
  user_id: string;
  integration_id: string;
  connected_calendar_id: string;
  external_calendar_id: string;
  external_event_id: string;
  local_event_id: string | null;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  start_at: string | null;
  end_at: string | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  all_day: boolean;
  recurrence: string[] | null;
  recurring_event_id: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  origin: "mbv" | "google";
  etag: string | null;
  google_updated_at: string | null;
  mbv_updated_at: string | null;
  last_synced_at: string | null;
  sync_state: "pending" | "synced" | "error" | "conflict" | "reconnect_required";
  pending_action: "create" | "update" | "delete" | null;
  operation_id: string | null;
  conflict: CalendarEvent["conflict"] | null;
  connected_calendars?: { name?: string } | Array<{ name?: string }> | null;
};

function calendarName(row: CalendarEventRow) {
  const relation = Array.isArray(row.connected_calendars) ? row.connected_calendars[0] : row.connected_calendars;
  return relation?.name ?? "Google Calendar";
}

export function toCalendarEventDto(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    integrationId: row.integration_id,
    connectedCalendarId: row.connected_calendar_id,
    externalCalendarId: row.external_calendar_id,
    externalEventId: row.external_event_id,
    localEventId: row.local_event_id ?? undefined,
    calendarName: calendarName(row),
    title: row.title,
    description: row.description ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    startTime: row.all_day ? undefined : row.start_time?.slice(0, 5),
    endTime: row.all_day ? undefined : row.end_time?.slice(0, 5),
    timezone: row.timezone,
    allDay: row.all_day,
    recurrence: row.recurrence ?? [],
    recurringEventId: row.recurring_event_id ?? undefined,
    status: row.status,
    origin: row.origin,
    etag: row.etag ?? undefined,
    googleUpdatedAt: row.google_updated_at ?? undefined,
    mbvUpdatedAt: row.mbv_updated_at ?? undefined,
    lastSyncedAt: row.last_synced_at ?? undefined,
    syncState: row.sync_state,
    pendingAction: row.pending_action ?? undefined,
    conflict: row.conflict ?? undefined,
  };
}

export function toConnectedCalendarDto(row: ConnectedCalendarRow): ConnectedCalendar {
  return {
    id: row.id,
    externalCalendarId: row.external_calendar_id,
    name: row.name,
    timezone: row.timezone ?? undefined,
    color: row.color ?? undefined,
    isVisible: row.is_visible,
    isWritable: row.is_writable,
    isDefault: row.is_default,
  };
}

export async function loadCalendarIntegration(service: SupabaseClient, userId: string) {
  const { data, error } = await service.from("calendar_integrations").select("*").eq("user_id", userId).eq("provider", "google").maybeSingle();
  if (error) throw error;
  return data as CalendarIntegrationRow | null;
}

export async function loadConnectedCalendars(service: SupabaseClient, integrationId: string) {
  const { data, error } = await service.from("connected_calendars").select("*").eq("integration_id", integrationId).order("is_default", { ascending: false }).order("name");
  if (error) throw error;
  return (data ?? []) as ConnectedCalendarRow[];
}

async function loadVisibleCalendarEventRows(
  service: SupabaseClient,
  userId: string,
  visibleCalendarIds: string[],
  mode: "window" | "linked",
  minDate: string,
  maxDate: string,
) {
  const rows: CalendarEventRow[] = [];
  for (let start = 0; ; start += 1_000) {
    let query = service.from("calendar_events")
      .select("*, connected_calendars(name)")
      .eq("user_id", userId)
      .in("connected_calendar_id", visibleCalendarIds);
    query = mode === "linked"
      ? query.not("local_event_id", "is", null)
      : query.gte("end_date", minDate).lte("start_date", maxDate);
    const { data, error } = await query.order("start_date").order("start_at").range(start, start + 999);
    if (error) throw error;
    const page = (data ?? []) as CalendarEventRow[];
    rows.push(...page);
    if (page.length < 1_000) break;
  }
  return rows;
}

export async function loadCalendarSnapshot(service: SupabaseClient, userId: string, configured = true): Promise<CalendarIntegrationSnapshot> {
  const integration = await loadCalendarIntegration(service, userId);
  if (!integration || integration.status === "disconnected") return { configured, integration: null, calendars: [], events: [] };
  const calendars = await loadConnectedCalendars(service, integration.id);
  const visibleCalendarIds = calendars.filter((calendar) => calendar.is_visible).map((calendar) => calendar.id);
  let eventRows: CalendarEventRow[] = [];
  if (visibleCalendarIds.length) {
    const minDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);
    const maxDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 370).toISOString().slice(0, 10);
    const [windowRows, linkedRows] = await Promise.all([
      loadVisibleCalendarEventRows(service, userId, visibleCalendarIds, "window", minDate, maxDate),
      loadVisibleCalendarEventRows(service, userId, visibleCalendarIds, "linked", minDate, maxDate),
    ]);
    eventRows = [...new Map([...windowRows, ...linkedRows].map((row) => [row.id, row])).values()]
      .sort((left, right) => left.start_date.localeCompare(right.start_date) || (left.start_at ?? "").localeCompare(right.start_at ?? ""));
  }
  return {
    configured,
    integration: {
      id: integration.id,
      provider: "google",
      email: integration.email,
      status: integration.status === "connecting" ? "reconnect_required" : integration.status,
      lastSyncedAt: integration.last_synced_at ?? undefined,
      lastErrorCode: integration.last_error_code ?? undefined,
    },
    calendars: calendars.map(toConnectedCalendarDto),
    events: eventRows.map(toCalendarEventDto),
  };
}

const GOOGLE_SYNC_PAGE_SIZE = 250;
const GOOGLE_SYNC_MAX_PAGES = 20;
const GOOGLE_SYNC_PAST_DAYS = 90;
const GOOGLE_SYNC_FUTURE_DAYS = 370;

function syncWindow(now = new Date()) {
  const start = new Date(now.getTime() - GOOGLE_SYNC_PAST_DAYS * 86_400_000);
  const end = new Date(now.getTime() + GOOGLE_SYNC_FUTURE_DAYS * 86_400_000);
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    minDate: start.toISOString().slice(0, 10),
    maxDate: end.toISOString().slice(0, 10),
  };
}

type GoogleSyncPayload = Record<string, unknown> & { externalEventId: string };

export function googleEventSyncPayload(resource: GoogleEventResource, fallbackTimezone: string, userHash: string): GoogleSyncPayload | null {
  if (resource.status === "cancelled" && !resource.start?.date && !resource.start?.dateTime) {
    if (!resource.id) return null;
    return {
      externalEventId: resource.id,
      status: "cancelled",
      tombstone: true,
      etag: resource.etag,
      googleUpdatedAt: resource.updated,
    };
  }
  const normalized = normalizeGoogleEvent(resource, fallbackTimezone, userHash);
  if (!normalized) return null;
  if (normalized.recurringEventId) {
    // `singleEvents=true` expands recurring instances. Google copies private
    // extended properties to each instance, but one local event id may only
    // own one row in MBV. Instances therefore keep their Google identity only.
    const instance = { ...normalized };
    delete instance.localEventId;
    return instance;
  }
  return { ...normalized };
}

async function applyGoogleSyncPage(
  service: SupabaseClient,
  integration: CalendarIntegrationRow,
  calendar: ConnectedCalendarRow,
  resources: GoogleEventResource[],
  syncedAt: string,
  userHash: string,
) {
  const events = resources
    .map((resource) => googleEventSyncPayload(resource, calendar.timezone ?? "UTC", userHash))
    .filter((event): event is GoogleSyncPayload => Boolean(event));
  if (!events.length) return;
  const { error } = await service.rpc("apply_google_calendar_sync_batch", {
    p_user_id: integration.user_id,
    p_integration_id: integration.id,
    p_connection_generation: integration.connection_generation ?? null,
    p_selection_generation: integration.selection_generation,
    p_connected_calendar_id: calendar.id,
    p_external_calendar_id: calendar.external_calendar_id,
    p_events: events,
    p_synced_at: syncedAt,
  });
  if (error) throw error;
}

async function loadRebaseCandidates(service: SupabaseClient, calendar: ConnectedCalendarRow, minDate: string, maxDate: string) {
  const candidates: Array<{ id: string; external_event_id: string }> = [];
  for (let start = 0; start < GOOGLE_SYNC_PAGE_SIZE * GOOGLE_SYNC_MAX_PAGES; start += 1_000) {
    const { data, error } = await service.from("calendar_events")
      .select("id,external_event_id")
      .eq("connected_calendar_id", calendar.id)
      .is("pending_action", null)
      .neq("sync_state", "conflict")
      .neq("status", "cancelled")
      .gte("end_date", minDate)
      .lte("start_date", maxDate)
      .range(start, start + 999);
    if (error) throw error;
    const page = (data ?? []) as Array<{ id: string; external_event_id: string }>;
    candidates.push(...page);
    if (page.length < 1_000) break;
  }
  return candidates;
}

export async function upsertGoogleEvent(
  service: SupabaseClient,
  integration: CalendarIntegrationRow,
  calendar: ConnectedCalendarRow,
  resource: GoogleEventResource,
  options: { force?: boolean; expectedOperationId?: string } = {},
) {
  const { data: current, error: currentError } = await service.from("calendar_events").select("*")
    .eq("integration_id", integration.id).eq("external_calendar_id", calendar.external_calendar_id).eq("external_event_id", resource.id).maybeSingle();
  if (currentError) throw currentError;
  if (options.expectedOperationId && (!current || current.operation_id !== options.expectedOperationId)) return false;
  const now = new Date().toISOString();
  if (resource.status === "cancelled" && !resource.start?.date && !resource.start?.dateTime) {
    if (current?.pending_action && current.pending_action !== "delete" && !options.force) {
      let query = service.from("calendar_events").update({
        sync_state: "conflict",
        conflict: {
          id: crypto.randomUUID(),
          detectedAt: now,
          google: { status: "cancelled", googleUpdatedAt: resource.updated },
          mbv: { title: current.title, description: current.description, startDate: current.start_date, endDate: current.end_date, timezone: current.timezone, allDay: current.all_day },
        },
      }).eq("id", current.id);
      if (options.expectedOperationId) query = query.eq("operation_id", options.expectedOperationId);
      const { error } = await query;
      if (error) throw error;
      return true;
    }
    let query = service.from("calendar_events").update({
      status: "cancelled", google_updated_at: resource.updated ?? now, etag: resource.etag ?? null,
      last_synced_at: now, sync_state: "synced", pending_action: null, operation_id: null, conflict: null,
    }).eq("id", current?.id ?? "00000000-0000-0000-0000-000000000000");
    if (options.expectedOperationId) query = query.eq("operation_id", options.expectedOperationId);
    const { error } = await query;
    if (error) throw error;
    return true;
  }
  const normalized = normalizeGoogleEvent(resource, calendar.timezone ?? "UTC", (await sha256(integration.user_id)).slice(0, 24));
  if (!normalized) return;
  const googleChangedAfterSync = Boolean(current?.last_synced_at && normalized.googleUpdatedAt && normalized.googleUpdatedAt > current.last_synced_at);
  const hasPendingMbvChange = Boolean(current?.pending_action);
  if (!options.force && current && googleChangedAfterSync && hasPendingMbvChange) {
    const { error } = await service.from("calendar_events").update({
      sync_state: "conflict",
      conflict: {
        id: crypto.randomUUID(),
        detectedAt: now,
        google: normalized,
        mbv: { title: current.title, description: current.description, startDate: current.start_date, endDate: current.end_date, timezone: current.timezone, allDay: current.all_day },
      },
    }).eq("id", current.id);
    if (error) throw error;
    return;
  }
  if (!options.force && current && hasPendingMbvChange) return;
  const payload = {
    user_id: integration.user_id,
    integration_id: integration.id,
    connected_calendar_id: calendar.id,
    external_calendar_id: calendar.external_calendar_id,
    external_event_id: normalized.externalEventId,
    local_event_id: normalized.recurringEventId ? null : normalized.localEventId ?? current?.local_event_id ?? null,
    i_cal_uid: normalized.iCalUid ?? null,
    title: normalized.title,
    description: normalized.description ?? null,
    start_at: normalized.startAt ?? null,
    end_at: normalized.endAt ?? null,
    start_date: normalized.startDate,
    end_date: normalized.endDate ?? normalized.startDate,
    start_time: normalized.startTime ?? null,
    end_time: normalized.endTime ?? null,
    timezone: normalized.timezone,
    all_day: normalized.allDay,
    recurrence: normalized.recurrence,
    recurring_event_id: normalized.recurringEventId ?? null,
    status: normalized.status,
    origin: normalized.origin,
    etag: normalized.etag ?? null,
    google_updated_at: normalized.googleUpdatedAt ?? now,
    last_synced_at: now,
    sync_state: "synced",
    pending_action: null,
    operation_id: null,
    conflict: null,
  };
  const { error } = options.expectedOperationId && current
    ? await service.from("calendar_events").update(payload).eq("id", current.id).eq("operation_id", options.expectedOperationId)
    : await service.from("calendar_events").upsert(payload, { onConflict: "integration_id,external_calendar_id,external_event_id" });
  if (error) throw error;
  return true;
}

export async function syncGoogleCalendar(
  service: SupabaseClient,
  config: CalendarServerConfig,
  integration: CalendarIntegrationRow,
  calendar: ConnectedCalendarRow,
  resetAttempted = false,
  refreshAttempted = false,
): Promise<void> {
  if (!calendar.is_visible) return;
  const accessToken = await accessTokenForIntegration(config, service, integration);
  const userHash = (await sha256(integration.user_id)).slice(0, 24);
  const fullSync = !calendar.sync_token;
  const window = syncWindow();
  const rebaseCandidates = fullSync ? await loadRebaseCandidates(service, calendar, window.minDate, window.maxDate) : [];
  const seenExternalIds = new Set<string>();
  const syncStartedAt = new Date().toISOString();
  let pageToken = "";
  let nextSyncToken = "";
  let pageCount = 0;
  try {
    do {
      pageCount += 1;
      if (pageCount > GOOGLE_SYNC_MAX_PAGES) throw new GoogleCalendarApiError(503, "SYNC_PAGE_LIMIT");
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events`);
      url.searchParams.set("maxResults", String(GOOGLE_SYNC_PAGE_SIZE));
      url.searchParams.set("showDeleted", "true");
      url.searchParams.set("singleEvents", "true");
      if (calendar.sync_token) url.searchParams.set("syncToken", calendar.sync_token);
      else {
        url.searchParams.set("timeMin", window.timeMin);
        url.searchParams.set("timeMax", window.timeMax);
      }
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const page = await googleApiJson<{ items?: GoogleEventResource[]; nextPageToken?: string; nextSyncToken?: string }>(accessToken, url.toString());
      const resources = page.items ?? [];
      for (const resource of resources) if (resource.id) seenExternalIds.add(resource.id);
      await applyGoogleSyncPage(service, integration, calendar, resources, syncStartedAt, userHash);
      pageToken = page.nextPageToken ?? "";
      nextSyncToken = page.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
  } catch (error) {
    if (error instanceof GoogleCalendarApiError && error.status === 401 && !refreshAttempted) {
      await accessTokenForIntegration(config, service, integration, true);
      return syncGoogleCalendar(service, config, integration, calendar, resetAttempted, true);
    }
    if (error instanceof GoogleCalendarApiError && error.status === 401) {
      let reconnectUpdate = service.from("calendar_integrations").update({ status: "reconnect_required", last_error_code: "GOOGLE_UNAUTHORIZED" }).eq("id", integration.id).eq("account_id", integration.account_id).eq("selection_generation", integration.selection_generation);
      if (integration.connection_generation) reconnectUpdate = reconnectUpdate.eq("connection_generation", integration.connection_generation);
      await reconnectUpdate;
      throw new GoogleCalendarApiError(401, "RECONNECT_REQUIRED");
    }
    if (error instanceof GoogleCalendarApiError && error.status === 410 && !resetAttempted) {
      calendar.sync_token = null;
      return syncGoogleCalendar(service, config, integration, calendar, true, refreshAttempted);
    }
    throw error;
  }
  const staleEventIds = fullSync
    ? rebaseCandidates.filter((candidate) => !seenExternalIds.has(candidate.external_event_id)).map((candidate) => candidate.id)
    : [];
  const now = new Date().toISOString();
  const { data: committed, error: commitError } = await service.rpc("commit_google_calendar_sync_run", {
    p_user_id: integration.user_id,
    p_integration_id: integration.id,
    p_connection_generation: integration.connection_generation ?? null,
    p_selection_generation: integration.selection_generation,
    p_connected_calendar_id: calendar.id,
    p_external_calendar_id: calendar.external_calendar_id,
    p_sync_started_at: syncStartedAt,
    p_stale_event_ids: staleEventIds,
    p_sync_token: nextSyncToken || calendar.sync_token || "",
    p_synced_at: now,
  });
  if (commitError) throw commitError;
  if (committed !== true) throw new GoogleCalendarApiError(409, "CALENDAR_CONNECTION_CHANGED");
}

export async function syncVisibleGoogleCalendars(service: SupabaseClient, config: CalendarServerConfig, integration: CalendarIntegrationRow) {
  const calendars = (await loadConnectedCalendars(service, integration.id)).filter((calendar) => calendar.is_visible);
  for (const calendar of calendars) await syncGoogleCalendar(service, config, integration, calendar);
}

export async function ensureGoogleCalendarWatch(service: SupabaseClient, config: CalendarServerConfig, integration: CalendarIntegrationRow, calendar: ConnectedCalendarRow) {
  if (!calendar.is_visible || !config.appBaseUrl.startsWith("https://")) return;
  const currentExpiry = calendar.channel_expires_at ? new Date(calendar.channel_expires_at).getTime() : 0;
  if (calendar.channel_id && currentExpiry > Date.now() + 24 * 60 * 60 * 1000) return;
  const accessToken = await accessTokenForIntegration(config, service, integration);
  const channelId = crypto.randomUUID();
  const channelToken = randomOpaqueValue(32);
  const response = await googleApiJson<{ id: string; resourceId: string; expiration?: string }>(
    accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/watch`,
    {
      method: "POST",
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: `${config.appBaseUrl}/api/integrations/google-calendar/webhook`,
        token: channelToken,
        params: { ttl: "604800" },
      }),
    },
  );
  const previous = { id: calendar.channel_id, resourceId: calendar.channel_resource_id };
  const { data: stored, error } = await service.rpc("store_google_calendar_watch", {
    p_user_id: integration.user_id,
    p_integration_id: integration.id,
    p_connection_generation: integration.connection_generation ?? null,
    p_selection_generation: integration.selection_generation,
    p_connected_calendar_id: calendar.id,
    p_external_calendar_id: calendar.external_calendar_id,
    p_channel_id: response.id,
    p_channel_resource_id: response.resourceId,
    p_channel_token_hash: await sha256(channelToken),
    p_channel_expires_at: response.expiration ? new Date(Number(response.expiration)).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
  if (stored !== true) {
    await googleApiJson(accessToken, "https://www.googleapis.com/calendar/v3/channels/stop", {
      method: "POST", body: JSON.stringify({ id: response.id, resourceId: response.resourceId }),
    }).catch(() => undefined);
    throw new GoogleCalendarApiError(409, "CALENDAR_CONNECTION_CHANGED");
  }
  if (previous.id && previous.resourceId) {
    await googleApiJson(accessToken, "https://www.googleapis.com/calendar/v3/channels/stop", {
      method: "POST", body: JSON.stringify(previous),
    }).catch(() => undefined);
  }
}

export async function stopGoogleCalendarWatch(accessToken: string, calendar: ConnectedCalendarRow) {
  if (!calendar.channel_id || !calendar.channel_resource_id) return;
  await googleApiJson(accessToken, "https://www.googleapis.com/calendar/v3/channels/stop", {
    method: "POST",
    body: JSON.stringify({ id: calendar.channel_id, resourceId: calendar.channel_resource_id }),
  }).catch(() => undefined);
}
