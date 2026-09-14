export type CalendarProvider = "google";

export type CalendarConnectionStatus = "connected" | "reconnect_required" | "disconnected";
export type CalendarSyncState = "pending" | "synced" | "error" | "conflict" | "reconnect_required";
export type CalendarEventOrigin = "mbv" | "google";
export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export interface CalendarIntegration {
  id: string;
  provider: CalendarProvider;
  email: string;
  status: CalendarConnectionStatus;
  lastSyncedAt?: string;
  lastErrorCode?: string;
}

export interface ConnectedCalendar {
  id: string;
  externalCalendarId: string;
  name: string;
  timezone?: string;
  color?: string;
  isVisible: boolean;
  isWritable: boolean;
  isDefault: boolean;
}

export interface CalendarEvent {
  id: string;
  integrationId: string;
  connectedCalendarId: string;
  externalCalendarId: string;
  externalEventId: string;
  localEventId?: string;
  calendarName: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone: string;
  allDay: boolean;
  recurrence: string[];
  recurringEventId?: string;
  status: CalendarEventStatus;
  origin: CalendarEventOrigin;
  etag?: string;
  googleUpdatedAt?: string;
  mbvUpdatedAt?: string;
  lastSyncedAt?: string;
  syncState: CalendarSyncState;
  pendingAction?: "create" | "update" | "delete";
  conflict?: {
    id: string;
    google?: Partial<CalendarEventInput>;
    mbv?: Partial<CalendarEventInput>;
    detectedAt: string;
  };
}

export interface CalendarEventInput {
  localEventId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone: string;
  allDay: boolean;
  connectedCalendarId: string;
}

export interface CalendarIntegrationSnapshot {
  configured: boolean;
  integration: CalendarIntegration | null;
  calendars: ConnectedCalendar[];
  events: CalendarEvent[];
}

export interface CalendarConfigurationInput {
  visibleCalendarIds: string[];
  defaultCalendarId: string;
}

export interface CalendarEventUpdateInput extends CalendarEventInput {
  expectedEtag?: string;
  lastSyncedAt?: string;
}

export type CalendarConflictResolutionInput =
  | { winner: "google"; localEventId: string; conflictId: string }
  | { winner: "mbv"; event: CalendarEventUpdateInput; conflictId: string };

export function isValidCalendarDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidCalendarTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function calendarEventOccursOnDate(event: Pick<CalendarEvent, "startDate" | "endDate" | "status">, dateKey: string) {
  if (event.status === "cancelled") return false;
  return event.startDate <= dateKey && (event.endDate ?? event.startDate) >= dateKey;
}

export function calendarEventTimeLabel(event: Pick<CalendarEvent, "allDay" | "startTime" | "endTime">, allDayLabel: string) {
  if (event.allDay || !event.startTime) return allDayLabel;
  return event.endTime ? `${event.startTime}–${event.endTime}` : event.startTime;
}

export function dedupeCalendarEvents<T extends Pick<CalendarEvent, "externalCalendarId" | "externalEventId" | "googleUpdatedAt">>(events: T[]) {
  const byExternalId = new Map<string, T>();
  for (const event of events) {
    const key = `${event.externalCalendarId}:${event.externalEventId}`;
    const current = byExternalId.get(key);
    if (!current || (event.googleUpdatedAt ?? "") >= (current.googleUpdatedAt ?? "")) byExternalId.set(key, event);
  }
  return [...byExternalId.values()];
}
