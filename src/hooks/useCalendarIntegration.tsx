"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CalendarConfigurationInput, CalendarEvent, CalendarEventInput, CalendarIntegrationSnapshot } from "@/src/domain/calendar";
import type { PlannerEvent } from "@/src/domain/planner";
import type { EventFormInput } from "@/src/lib/schemas";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { useAccount } from "@/src/hooks/useAccount";
import { calendarIntegrationService } from "@/src/services/calendarIntegrationService";
import { CalendarHttpError } from "@/src/repositories/http/HttpGoogleCalendarRepository";

const emptySnapshot: CalendarIntegrationSnapshot = { configured: true, integration: null, calendars: [], events: [] };

export type ManagedCalendarEventInput = EventFormInput & {
  connectedCalendarId?: string;
  syncWithGoogle?: boolean;
};

interface CalendarIntegrationController {
  snapshot: CalendarIntegrationSnapshot;
  events: CalendarEvent[];
  connected: boolean;
  loading: boolean;
  syncing: boolean;
  saving: boolean;
  error: string | null;
  notice: string | null;
  connect(): Promise<void>;
  completeConnection(): Promise<boolean>;
  configure(input: CalendarConfigurationInput): Promise<void>;
  syncNow(): Promise<void>;
  disconnect(): Promise<void>;
  createEvent(input: ManagedCalendarEventInput): Promise<void>;
  updateEvent(eventId: string, input: ManagedCalendarEventInput): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  resolveConflict(eventId: string, winner: "google" | "mbv"): Promise<void>;
}

const CalendarIntegrationContext = createContext<CalendarIntegrationController | null>(null);

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function remoteInput(event: PlannerEvent, connectedCalendarId: string): CalendarEventInput {
  return {
    localEventId: event.id,
    title: event.title,
    description: event.notes,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime ?? event.time,
    endTime: event.endTime,
    timezone: event.timezone ?? browserTimezone(),
    allDay: event.allDay ?? !(event.startTime ?? event.time),
    connectedCalendarId,
  };
}

export function calendarSyncStateForError(error: unknown): PlannerEvent["syncState"] {
  if (!(error instanceof CalendarHttpError)) return "pending";
  if (error.code === "ETAG_CONFLICT") return "conflict";
  if (error.status === 401 || ["RECONNECT_REQUIRED", "GOOGLE_UNAUTHORIZED", "CALENDAR_NOT_CONNECTED"].includes(error.code)) return "reconnect_required";
  if (error.code === "CALENDAR_CONNECTION_CHANGED") return "pending";
  return "error";
}

export function CalendarIntegrationProvider({ planner, children }: { planner: PlannerController; children: ReactNode }) {
  const account = useAccount();
  const plannerRef = useRef(planner);
  const snapshotRef = useRef<CalendarIntegrationSnapshot>(emptySnapshot);
  const syncingRef = useRef(false);
  const [snapshot, setSnapshot] = useState<CalendarIntegrationSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    plannerRef.current = planner;
  }, [planner]);

  const applySnapshot = useCallback(async (next: CalendarIntegrationSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    if (next.configured) {
      await plannerRef.current.reconcileCalendarEvents(next.events, {
        integrationId: next.integration?.id ?? null,
        visibleCalendarIds: next.calendars.filter((calendar) => calendar.isVisible).map((calendar) => calendar.id),
      });
    }
  }, []);

  const withToken = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    const token = await account.getAccessToken();
    if (!token) throw new Error("ACCOUNT_SESSION_REQUIRED");
    return operation(token);
  }, [account]);

  const flushPendingEvents = useCallback(async (token: string) => {
    const pendingEvents = plannerRef.current.snapshot.events.filter((event) =>
      event.calendarProvider === "google"
      && Boolean(event.connectedCalendarId)
      && Boolean(event.pendingAction)
      && event.syncState !== "conflict",
    );
    let firstError: unknown = null;
    let blockPull = false;
    for (const event of pendingEvents) {
      try {
        const input = remoteInput(event, event.connectedCalendarId as string);
        if (event.pendingAction === "create") {
          await applySnapshot(await calendarIntegrationService.createEvent(token, input));
        } else if (event.pendingAction === "update") {
          await applySnapshot(await calendarIntegrationService.updateEvent(token, { ...input, expectedEtag: event.etag, lastSyncedAt: event.lastSyncedAt }));
        } else {
          await applySnapshot(await calendarIntegrationService.deleteEvent(token, { ...input, expectedEtag: event.etag, lastSyncedAt: event.lastSyncedAt }));
          await plannerRef.current.deleteEvent(event.id);
        }
      } catch (caught) {
        const syncState = calendarSyncStateForError(caught);
        await plannerRef.current.updateEventSync(event.id, { syncState, pendingAction: event.pendingAction });
        if (caught instanceof CalendarHttpError && caught.snapshot) await applySnapshot(caught.snapshot);
        firstError ??= caught;
        blockPull = syncState === "conflict"
          || syncState === "reconnect_required"
          || !(caught instanceof CalendarHttpError)
          || caught.status === 429
          || caught.status >= 500;
        if (blockPull) break;
      }
    }
    return { firstError, blockPull };
  }, [applySnapshot]);

  const syncNow = useCallback(async () => {
    if (!snapshotRef.current.integration || snapshotRef.current.integration.status !== "connected" || syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true); setError(null);
    try {
      const result = await withToken(async (token) => {
        const flushed = await flushPendingEvents(token);
        if (flushed.blockPull) throw flushed.firstError;
        const next = await calendarIntegrationService.sync(token);
        return { next, pendingError: flushed.firstError };
      });
      await applySnapshot(result.next);
      if (result.pendingError) throw result.pendingError;
      setNotice("synced");
    } catch (caught) {
      setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_SYNC_FAILED");
      if (caught instanceof CalendarHttpError && caught.snapshot) await applySnapshot(caught.snapshot);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [applySnapshot, flushPendingEvents, withToken]);

  const reloadStatus = useCallback(async () => {
    const next = await withToken((token) => calendarIntegrationService.getStatus(token));
    await applySnapshot(next);
    setError(null);
    return next;
  }, [applySnapshot, withToken]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void reloadStatus()
        .catch((caught) => { if (active) setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_STATUS_FAILED"); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [account.user?.id, reloadStatus]);

  useEffect(() => {
    const recover = () => {
      void reloadStatus()
        .then((next) => { if (next.integration?.status === "connected") void syncNow(); })
        .catch((caught) => setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_STATUS_FAILED"));
    };
    window.addEventListener("online", recover);
    return () => window.removeEventListener("online", recover);
  }, [reloadStatus, syncNow]);

  useEffect(() => {
    const connectedIntegrationId = snapshot.integration?.status === "connected" ? snapshot.integration.id : null;
    if (!connectedIntegrationId) return;
    const refresh = () => { if (document.visibilityState === "visible" && navigator.onLine) void syncNow(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 120_000);
    const initialTimer = window.setTimeout(refresh, 0);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); window.clearTimeout(initialTimer); };
  }, [snapshot.integration?.id, snapshot.integration?.status, syncNow]);

  const connect = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      const authorizationUrl = await withToken((token) => calendarIntegrationService.beginConnection(token, `${window.location.pathname}${window.location.search}`));
      window.location.assign(authorizationUrl);
    } catch (caught) {
      setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_CONNECT_FAILED");
      setSaving(false);
    }
  }, [withToken]);

  const completeConnection = useCallback(async () => {
    setSaving(true); setError(null); setNotice(null);
    try {
      await applySnapshot(await withToken((token) => calendarIntegrationService.completeConnection(token)));
      setNotice("connection_completed");
      return true;
    } catch (caught) {
      setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_CONNECTION_FAILED");
      return false;
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }, [applySnapshot, withToken]);

  const configure = useCallback(async (input: CalendarConfigurationInput) => {
    setSaving(true); setError(null); setNotice(null);
    const hasPendingInRemovedCalendar = plannerRef.current.snapshot.events.some((event) => event.calendarProvider === "google" && Boolean(event.pendingAction) && Boolean(event.connectedCalendarId) && !input.visibleCalendarIds.includes(event.connectedCalendarId as string));
    if (hasPendingInRemovedCalendar) { setError("CALENDAR_PENDING_CHANGES"); setSaving(false); return; }
    try { await applySnapshot(await withToken((token) => calendarIntegrationService.configure(token, input))); setNotice("configuration_saved"); }
    catch (caught) { setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_CONFIGURATION_FAILED"); }
    finally { setSaving(false); }
  }, [applySnapshot, withToken]);

  const createEvent = useCallback(async (input: ManagedCalendarEventInput) => {
    const localEventId = crypto.randomUUID();
    const defaultCalendar = snapshot.calendars.find((calendar) => calendar.id === input.connectedCalendarId) ?? snapshot.calendars.find((calendar) => calendar.isDefault && calendar.isWritable);
    const shouldQueue = Boolean(input.syncWithGoogle && snapshot.integration && defaultCalendar);
    const canPushNow = Boolean(shouldQueue && snapshot.integration?.status === "connected" && navigator.onLine);
    await plannerRef.current.createEvent(input, shouldQueue ? {
      id: localEventId, calendarProvider: "google", integrationId: snapshot.integration?.id,
      connectedCalendarId: defaultCalendar?.id, externalCalendarId: defaultCalendar?.externalCalendarId,
      calendarName: defaultCalendar?.name, origin: "mbv", syncState: snapshot.integration?.status === "reconnect_required" ? "reconnect_required" : "pending", pendingAction: "create",
    } : { id: localEventId, origin: "mbv", syncState: "local" });
    if (!canPushNow || !defaultCalendar) return;
    setSaving(true); setError(null);
    const local = plannerRef.current.snapshot.events.find((event) => event.id === localEventId) ?? {
      id: localEventId, title: input.title, startDate: input.startDate, endDate: input.endDate,
      startTime: input.startTime ?? input.time, endTime: input.endTime, allDay: input.allDay,
      timezone: input.timezone, category: input.category, notes: input.notes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    try {
      await applySnapshot(await withToken((token) => calendarIntegrationService.createEvent(token, remoteInput(local, defaultCalendar.id))));
      setNotice("event_synced");
    } catch (caught) {
      await plannerRef.current.updateEventSync(localEventId, { syncState: calendarSyncStateForError(caught), pendingAction: "create" });
      setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_EVENT_CREATE_FAILED");
    } finally { setSaving(false); }
  }, [applySnapshot, snapshot.calendars, snapshot.integration, withToken]);

  const updateEvent = useCallback(async (eventId: string, input: ManagedCalendarEventInput) => {
    const current = plannerRef.current.snapshot.events.find((event) => event.id === eventId);
    if (!current) return;
    const requestedCalendar = snapshot.calendars.find((calendar) => calendar.id === input.connectedCalendarId && calendar.isWritable)
      ?? snapshot.calendars.find((calendar) => calendar.isDefault && calendar.isWritable);
    const linked = current.calendarProvider === "google" && Boolean(current.connectedCalendarId);
    const attaching = !linked && Boolean(input.syncWithGoogle && snapshot.integration?.status === "connected" && requestedCalendar);
    const pendingCreate = linked && current.pendingAction === "create";
    const connectedCalendarId = linked ? current.connectedCalendarId : requestedCalendar?.id;
    const targetCalendar = snapshot.calendars.find((calendar) => calendar.id === connectedCalendarId);
    const shouldQueue = Boolean((linked || attaching) && connectedCalendarId);
    const canPushNow = Boolean(shouldQueue && snapshot.integration?.status === "connected" && navigator.onLine && current.syncState !== "conflict");
    // A local edit made while the original POST is still queued must remain a
    // create. The server-side create is deterministic/idempotent, whereas a
    // PATCH would target an event that may not exist in Google yet.
    const pendingAction = attaching || pendingCreate ? "create" as const : "update" as const;
    await plannerRef.current.updateEvent(eventId, input, shouldQueue ? {
      calendarProvider: "google",
      integrationId: snapshot.integration?.id ?? current.integrationId,
      connectedCalendarId,
      externalCalendarId: targetCalendar?.externalCalendarId ?? current.externalCalendarId,
      externalEventId: current.externalEventId,
      calendarName: targetCalendar?.name ?? current.calendarName,
      origin: "mbv",
      syncState: current.syncState === "conflict" ? "conflict" : snapshot.integration?.status === "reconnect_required" ? "reconnect_required" : "pending",
      pendingAction,
    } : {});
    if (!canPushNow || !connectedCalendarId) return;
    const updated: PlannerEvent = { ...current, ...input, startTime: input.startTime ?? input.time, connectedCalendarId, updatedAt: new Date().toISOString() };
    setSaving(true); setError(null);
    try {
      await applySnapshot(await withToken((token) => attaching || pendingCreate
        ? calendarIntegrationService.createEvent(token, remoteInput(updated, connectedCalendarId))
        : calendarIntegrationService.updateEvent(token, { ...remoteInput(updated, connectedCalendarId), expectedEtag: current.etag, lastSyncedAt: current.lastSyncedAt })));
      setNotice("event_synced");
    } catch (caught) {
      await plannerRef.current.updateEventSync(eventId, { syncState: calendarSyncStateForError(caught), pendingAction });
      if (caught instanceof CalendarHttpError && caught.snapshot) await applySnapshot(caught.snapshot);
      setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_EVENT_UPDATE_FAILED");
    } finally { setSaving(false); }
  }, [applySnapshot, snapshot.calendars, snapshot.integration, withToken]);

  const deleteEvent = useCallback(async (eventId: string) => {
    const current = plannerRef.current.snapshot.events.find((event) => event.id === eventId);
    if (!current) return;
    if (current.calendarProvider !== "google" || !current.connectedCalendarId) {
      await plannerRef.current.deleteEvent(eventId);
      return;
    }
    const canPushNow = snapshot.integration?.status === "connected" && navigator.onLine && current.syncState !== "conflict";
    await plannerRef.current.updateEventSync(eventId, {
      syncState: current.syncState === "conflict" ? "conflict" : snapshot.integration?.status === "reconnect_required" ? "reconnect_required" : "pending",
      pendingAction: "delete",
    });
    if (!canPushNow) return;
    setSaving(true); setError(null);
    try {
      await applySnapshot(await withToken((token) => calendarIntegrationService.deleteEvent(token, { ...remoteInput(current, current.connectedCalendarId as string), expectedEtag: current.etag, lastSyncedAt: current.lastSyncedAt })));
      await plannerRef.current.deleteEvent(eventId);
      setNotice("event_deleted");
    } catch (caught) {
      await plannerRef.current.updateEventSync(eventId, { syncState: calendarSyncStateForError(caught), pendingAction: "delete" });
      if (caught instanceof CalendarHttpError && caught.snapshot) await applySnapshot(caught.snapshot);
      setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_EVENT_DELETE_FAILED");
    } finally { setSaving(false); }
  }, [applySnapshot, snapshot.integration, withToken]);

  const resolveConflict = useCallback(async (eventId: string, winner: "google" | "mbv") => {
    const current = plannerRef.current.snapshot.events.find((event) => event.id === eventId);
    if (!current?.connectedCalendarId) return;
    const conflictId = snapshotRef.current.events.find((event) => event.localEventId === eventId && event.syncState === "conflict")?.conflict?.id;
    if (!conflictId) {
      await reloadStatus().catch(() => undefined);
      setError("CALENDAR_CONNECTION_CHANGED");
      return;
    }
    setSaving(true); setError(null);
    try {
      const next = winner === "google"
        ? await withToken((token) => calendarIntegrationService.resolveConflict(token, { winner, localEventId: eventId, conflictId }))
        : await withToken((token) => calendarIntegrationService.resolveConflict(token, { winner, event: { ...remoteInput(current, current.connectedCalendarId as string), expectedEtag: current.etag, lastSyncedAt: current.lastSyncedAt }, conflictId }));
      await applySnapshot(next);
      if (winner === "mbv" && current.pendingAction === "delete") await plannerRef.current.deleteEvent(eventId);
      setNotice("conflict_resolved");
    } catch (caught) {
      if (caught instanceof CalendarHttpError && caught.snapshot) await applySnapshot(caught.snapshot);
      setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_CONFLICT_FAILED");
    }
    finally { setSaving(false); }
  }, [applySnapshot, reloadStatus, withToken]);

  const disconnect = useCallback(async () => {
    setSaving(true); setError(null);
    try { await applySnapshot(await withToken((token) => calendarIntegrationService.disconnect(token))); await plannerRef.current.detachGoogleCalendar(); setNotice("disconnected"); }
    catch (caught) { setError(caught instanceof CalendarHttpError ? caught.code : "CALENDAR_DISCONNECT_FAILED"); }
    finally { setSaving(false); }
  }, [applySnapshot, withToken]);

  const value = useMemo<CalendarIntegrationController>(() => ({
    snapshot,
    events: snapshot.events.filter((event) => event.status !== "cancelled"),
    connected: snapshot.integration?.status === "connected",
    loading, syncing, saving, error, notice,
    connect, completeConnection, configure, syncNow, disconnect, createEvent, updateEvent, deleteEvent, resolveConflict,
  }), [completeConnection, configure, connect, createEvent, deleteEvent, disconnect, error, loading, notice, resolveConflict, saving, snapshot, syncNow, syncing, updateEvent]);

  return <CalendarIntegrationContext.Provider value={value}>{children}</CalendarIntegrationContext.Provider>;
}

export function useCalendarIntegration() {
  const context = useContext(CalendarIntegrationContext);
  if (!context) throw new Error("useCalendarIntegration debe usarse dentro de CalendarIntegrationProvider");
  return context;
}
