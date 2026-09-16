import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/src/lib/serverAuth";
import { calendarPlanningDateAllowedForProfile, requireCalendarAccess, type CalendarAccessProfile } from "@/src/server/calendar/access";
import { createCalendarServiceClient, requireCalendarServerConfig } from "@/src/server/calendar/config";
import { sha256 } from "@/src/server/calendar/crypto";
import { calendarErrorResponse, calendarFeatureDisabledResponse } from "@/src/server/calendar/http";
import { buildGoogleEventResource, googleApiJsonForIntegration, GoogleCalendarApiError, googleEventContentMatchesInput, googleEventIdForLocal, isOwnedGoogleEvent, normalizeGoogleEvent, type CalendarIntegrationRow, type ConnectedCalendarRow, type GoogleEventResource } from "@/src/server/calendar/googleApi";
import { loadCalendarIntegration, loadCalendarSnapshot, loadConnectedCalendars, upsertGoogleEvent } from "@/src/server/calendar/sync";
import { isValidCalendarDateKey, isValidCalendarTimezone } from "@/src/domain/calendar";

const dateKey = z.string().refine(isValidCalendarDateKey, "INVALID_EVENT_DATE");
const timeKey = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const eventInputSchema = z.object({
  localEventId: z.string().trim().min(8).max(120),
  title: z.string().trim().min(2).max(500),
  description: z.string().trim().max(8000).optional(),
  startDate: dateKey,
  endDate: dateKey.optional(),
  startTime: timeKey.optional(),
  endTime: timeKey.optional(),
  timezone: z.string().trim().min(1).max(100).refine(isValidCalendarTimezone, "INVALID_EVENT_TIMEZONE"),
  allDay: z.boolean(),
  connectedCalendarId: z.string().uuid(),
  expectedEtag: z.string().max(500).optional(),
  lastSyncedAt: z.string().datetime().optional(),
}).superRefine((event, context) => {
  if (!event.allDay && (!event.startTime || !event.endTime)) context.addIssue({ code: "custom", message: "EVENT_TIME_REQUIRED" });
  const start = `${event.startDate}T${event.startTime ?? "00:00"}`;
  const end = `${event.endDate ?? event.startDate}T${event.endTime ?? "23:59"}`;
  if (end <= start) context.addIssue({ code: "custom", message: "EVENT_END_BEFORE_START" });
});

async function calendarContext(request: NextRequest) {
  const disabled = calendarFeatureDisabledResponse();
  if (disabled) throw disabled;
  const auth = await authenticateRequest(request);
  if (auth.e2e) throw new Response(JSON.stringify({ error: "CALENDAR_NOT_CONFIGURED" }), { status: 503, headers: { "Content-Type": "application/json" } });
  const access = await requireCalendarAccess(auth.client, auth.userId);
  const config = requireCalendarServerConfig();
  const service = createCalendarServiceClient(config);
  const integration = await loadCalendarIntegration(service, auth.userId);
  if (!integration || integration.status === "disconnected" || integration.status === "connecting") throw new Response(JSON.stringify({ error: "CALENDAR_NOT_CONNECTED" }), { status: 409, headers: { "Content-Type": "application/json" } });
  if (integration.status === "reconnect_required") throw new GoogleCalendarApiError(401, "RECONNECT_REQUIRED");
  return {
    auth, access, config, service, integration,
    google: <T,>(url: string, init: RequestInit = {}) => googleApiJsonForIntegration<T>(config, service, integration, url, init),
  };
}

function requireEventDateAccess(access: CalendarAccessProfile, input: z.infer<typeof eventInputSchema>) {
  if (!calendarPlanningDateAllowedForProfile(access, input.startDate)
    || !calendarPlanningDateAllowedForProfile(access, input.endDate ?? input.startDate)) {
    throw new Response(JSON.stringify({ error: "CALENDAR_DATE_OUTSIDE_ACCESS" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
}

async function createGoogleEventIdempotently(
  context: Awaited<ReturnType<typeof calendarContext>>,
  calendar: ConnectedCalendarRow,
  input: z.infer<typeof eventInputSchema>,
  externalEventId: string,
  payload: GoogleEventResource,
  userHash: string,
) {
  const collectionUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events?sendUpdates=none`;
  const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${encodeURIComponent(externalEventId)}`;
  try {
    return { resource: await context.google<GoogleEventResource>(collectionUrl, { method: "POST", body: JSON.stringify({ ...payload, id: externalEventId }) }), conflict: false };
  } catch (error) {
    if (!(error instanceof GoogleCalendarApiError) || error.code !== "GOOGLE_EVENT_DUPLICATE") throw error;
    const existing = await context.google<GoogleEventResource>(eventUrl);
    if (!isOwnedGoogleEvent(existing, input.localEventId, userHash)) throw new GoogleCalendarApiError(409, "GOOGLE_EVENT_ID_COLLISION");
    return { resource: existing, conflict: !googleEventContentMatchesInput(existing, input, userHash) };
  }
}

async function writableCalendar(service: ReturnType<typeof createCalendarServiceClient>, integrationId: string, calendarId: string) {
  const calendars = await loadConnectedCalendars(service, integrationId);
  const calendar = calendars.find((item) => item.id === calendarId);
  if (!calendar || !calendar.is_visible || !calendar.is_writable) throw new Response(JSON.stringify({ error: "CALENDAR_NOT_WRITABLE" }), { status: 400, headers: { "Content-Type": "application/json" } });
  return calendar;
}

async function pendingRow(service: ReturnType<typeof createCalendarServiceClient>, userId: string, integration: CalendarIntegrationRow, calendar: ConnectedCalendarRow, input: z.infer<typeof eventInputSchema>, action: "create" | "update" | "delete", externalEventId: string, expectedEtag?: string) {
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const { data, error } = await service.rpc("stage_google_calendar_event_operation", {
    p_user_id: userId,
    p_integration_id: integration.id,
    p_connection_generation: integration.connection_generation ?? null,
    p_selection_generation: integration.selection_generation,
    p_connected_calendar_id: calendar.id,
    p_external_event_id: externalEventId,
    p_local_event_id: input.localEventId,
    p_action: action,
    p_event: input,
    p_operation_id: operationId,
    p_now: now,
    p_expected_etag: expectedEtag ?? null,
  }).single();
  if (error) throw error;
  const staged = data as { row_id: string; operation_id: string; row_created: boolean; conflicted: boolean };
  return { rowId: staged.row_id, operationId: staged.operation_id, rowCreated: staged.row_created, conflicted: staged.conflicted };
}

async function releasePendingOperation(service: ReturnType<typeof createCalendarServiceClient>, operation: { rowId: string; operationId: string }) {
  const { error } = await service.from("calendar_events").update({ operation_id: null })
    .eq("id", operation.rowId).eq("operation_id", operation.operationId);
  if (error) throw error;
}

async function discardUnsafePendingCreate(service: ReturnType<typeof createCalendarServiceClient>, operation: { rowId: string; operationId: string; rowCreated: boolean }) {
  if (!operation.rowCreated) {
    await releasePendingOperation(service, operation);
    return;
  }
  const { error } = await service.from("calendar_events").delete()
    .eq("id", operation.rowId).eq("operation_id", operation.operationId).eq("pending_action", "create");
  if (error) throw error;
}

async function recordOperationConflict(
  service: ReturnType<typeof createCalendarServiceClient>,
  userId: string,
  operation: { rowId: string; operationId: string },
  input: z.infer<typeof eventInputSchema>,
  action: "create" | "update" | "delete",
  google: NonNullable<ReturnType<typeof normalizeGoogleEvent>> | { status: "confirmed" | "tentative" | "cancelled"; externalEventId: string },
) {
  const { data: conflicted, error } = await service.from("calendar_events").update({
    sync_state: "conflict",
    pending_action: action,
    operation_id: null,
    conflict: { id: crypto.randomUUID(), detectedAt: new Date().toISOString(), google, mbv: input },
  }).eq("id", operation.rowId).eq("operation_id", operation.operationId).select("id").maybeSingle();
  if (error) {
    await releasePendingOperation(service, operation).catch(() => undefined);
    throw error;
  }
  if (!conflicted) throw new GoogleCalendarApiError(409, "CALENDAR_CONNECTION_CHANGED");
  return NextResponse.json({ error: "ETAG_CONFLICT", snapshot: await loadCalendarSnapshot(service, userId) }, { status: 409 });
}

async function stagedConflictResponse(service: ReturnType<typeof createCalendarServiceClient>, userId: string) {
  return NextResponse.json({ error: "ETAG_CONFLICT", snapshot: await loadCalendarSnapshot(service, userId) }, { status: 409 });
}

export async function POST(request: NextRequest) {
  try {
    const context = await calendarContext(request);
    const input = eventInputSchema.parse(await request.json());
    requireEventDateAccess(context.access, input);
    const calendar = await writableCalendar(context.service, context.integration.id, input.connectedCalendarId);
    const externalEventId = googleEventIdForLocal(input.localEventId);
    const operation = await pendingRow(context.service, context.auth.userId, context.integration, calendar, input, "create", externalEventId);
    if (operation.conflicted) return stagedConflictResponse(context.service, context.auth.userId);
    const userHash = (await sha256(context.auth.userId)).slice(0, 24);
    const payload = buildGoogleEventResource(input, userHash);
    try {
      const created = await createGoogleEventIdempotently(context, calendar, input, externalEventId, payload, userHash);
      if (created.conflict) {
        const normalized = normalizeGoogleEvent(created.resource, calendar.timezone ?? "UTC", userHash)
          ?? { status: created.resource.status ?? "confirmed", externalEventId: created.resource.id };
        return await recordOperationConflict(context.service, context.auth.userId, operation, input, "create", normalized);
      }
      await upsertGoogleEvent(context.service, context.integration, calendar, created.resource, { force: true, expectedOperationId: operation.operationId });
    } catch (error) {
      if (error instanceof GoogleCalendarApiError && error.code === "GOOGLE_EVENT_ID_COLLISION") {
        await discardUnsafePendingCreate(context.service, operation);
      } else {
        await releasePendingOperation(context.service, operation).catch(() => undefined);
      }
      throw error;
    }
    return NextResponse.json(await loadCalendarSnapshot(context.service, context.auth.userId), { status: 201 });
  } catch (error) {
    return calendarErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await calendarContext(request);
    const input = eventInputSchema.parse(await request.json());
    requireEventDateAccess(context.access, input);
    const { data: link, error: linkError } = await context.service.from("calendar_events").select("*").eq("user_id", context.auth.userId).eq("integration_id", context.integration.id).eq("local_event_id", input.localEventId).maybeSingle();
    if (linkError) throw linkError;
    if (!link) return NextResponse.json({ error: "CALENDAR_EVENT_NOT_LINKED" }, { status: 404 });
    const calendar = await writableCalendar(context.service, context.integration.id, link.connected_calendar_id);
    const pendingCreate = link.pending_action === "create";
    const operation = await pendingRow(context.service, context.auth.userId, context.integration, calendar, input, pendingCreate ? "create" : "update", link.external_event_id, pendingCreate ? undefined : input.expectedEtag);
    if (operation.conflicted) return stagedConflictResponse(context.service, context.auth.userId);
    const storedEtag = pendingCreate ? undefined : input.expectedEtag;
    const userHash = (await sha256(context.auth.userId)).slice(0, 24);
    const googlePayload = buildGoogleEventResource({ ...input, connectedCalendarId: calendar.id }, userHash);
    const payload = { ...googlePayload, id: undefined };
    try {
      let resource: GoogleEventResource;
      if (pendingCreate) {
        const created = await createGoogleEventIdempotently(context, calendar, input, link.external_event_id, googlePayload, userHash);
        if (created.conflict) {
          const normalized = normalizeGoogleEvent(created.resource, calendar.timezone ?? "UTC", userHash)
            ?? { status: created.resource.status ?? "confirmed", externalEventId: created.resource.id };
          return await recordOperationConflict(context.service, context.auth.userId, operation, input, "create", normalized);
        }
        resource = created.resource;
      } else {
        resource = await context.google<GoogleEventResource>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${encodeURIComponent(link.external_event_id)}?sendUpdates=none`, {
          method: "PATCH",
          headers: { "If-Match": storedEtag as string },
          body: JSON.stringify(payload),
        });
      }
      await upsertGoogleEvent(context.service, context.integration, calendar, resource, { force: true, expectedOperationId: operation.operationId });
    } catch (error) {
      if (pendingCreate && error instanceof GoogleCalendarApiError && error.code === "GOOGLE_EVENT_ID_COLLISION") {
        await discardUnsafePendingCreate(context.service, operation);
        throw error;
      }
      if (!(error instanceof GoogleCalendarApiError) || (error.code !== "ETAG_CONFLICT" && ![404, 410].includes(error.status))) {
        await releasePendingOperation(context.service, operation).catch(() => undefined);
        throw error;
      }
      let normalized;
      try {
        if ([404, 410].includes(error.status)) {
          normalized = { status: "cancelled" as const, externalEventId: link.external_event_id };
        } else {
          const remote = await context.google<GoogleEventResource>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${encodeURIComponent(link.external_event_id)}`);
          normalized = normalizeGoogleEvent(remote, calendar.timezone ?? "UTC", userHash)
            ?? { status: remote.status ?? "confirmed", externalEventId: remote.id };
        }
      } catch (refreshError) {
        await releasePendingOperation(context.service, operation).catch(() => undefined);
        throw refreshError;
      }
      return await recordOperationConflict(context.service, context.auth.userId, operation, input, "update", normalized);
    }
    return NextResponse.json(await loadCalendarSnapshot(context.service, context.auth.userId));
  } catch (error) {
    return calendarErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await calendarContext(request);
    const input = eventInputSchema.parse(await request.json());
    const { data: link, error: linkError } = await context.service.from("calendar_events").select("*").eq("user_id", context.auth.userId).eq("integration_id", context.integration.id).eq("local_event_id", input.localEventId).maybeSingle();
    if (linkError) throw linkError;
    if (!link) return NextResponse.json(await loadCalendarSnapshot(context.service, context.auth.userId));
    if (!calendarPlanningDateAllowedForProfile(context.access, link.start_date)
      || !calendarPlanningDateAllowedForProfile(context.access, link.end_date ?? link.start_date)) {
      return NextResponse.json({ error: "CALENDAR_DATE_OUTSIDE_ACCESS" }, { status: 403 });
    }
    const calendar = await writableCalendar(context.service, context.integration.id, link.connected_calendar_id);
    const pendingCreate = link.pending_action === "create";
    const operation = await pendingRow(context.service, context.auth.userId, context.integration, calendar, input, "delete", link.external_event_id, pendingCreate ? undefined : input.expectedEtag);
    if (operation.conflicted) return stagedConflictResponse(context.service, context.auth.userId);
    const storedEtag = pendingCreate ? undefined : input.expectedEtag;
    try {
      const remoteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${encodeURIComponent(link.external_event_id)}`;
      let deleteEtag = storedEtag;
      if (pendingCreate) {
        let remote: GoogleEventResource | null = null;
        try { remote = await context.google<GoogleEventResource>(remoteUrl); }
        catch (error) {
          if (!(error instanceof GoogleCalendarApiError) || ![404, 410].includes(error.status)) throw error;
        }
        if (remote) {
          const userHash = (await sha256(context.auth.userId)).slice(0, 24);
          const ownedByLocalEvent = isOwnedGoogleEvent(remote, input.localEventId, userHash);
          if (ownedByLocalEvent && !googleEventContentMatchesInput(remote, input, userHash)) {
            const normalized = normalizeGoogleEvent(remote, calendar.timezone ?? "UTC", userHash)
              ?? { status: remote.status ?? "confirmed", externalEventId: remote.id };
            return await recordOperationConflict(context.service, context.auth.userId, operation, input, "delete", normalized);
          }
          if (ownedByLocalEvent) {
            if (!remote.etag) throw new GoogleCalendarApiError(409, "ETAG_CONFLICT");
            deleteEtag = remote.etag;
          } else {
            // The deterministic id belongs to another Google event. Complete
            // the local deletion without ever mutating that foreign resource.
            deleteEtag = undefined;
          }
        } else {
          deleteEtag = undefined;
        }
      }
      if (deleteEtag) await context.google(`${remoteUrl}?sendUpdates=none`, { method: "DELETE", headers: { "If-Match": deleteEtag } });
    } catch (error) {
      if (pendingCreate && error instanceof GoogleCalendarApiError && error.code === "GOOGLE_EVENT_ID_COLLISION") {
        await discardUnsafePendingCreate(context.service, operation);
        throw error;
      }
      if (error instanceof GoogleCalendarApiError && error.code === "ETAG_CONFLICT") {
        try {
          const remote = await context.google<GoogleEventResource>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${encodeURIComponent(link.external_event_id)}`);
          const userHash = (await sha256(context.auth.userId)).slice(0, 24);
          const normalized = normalizeGoogleEvent(remote, calendar.timezone ?? "UTC", userHash)
            ?? { status: remote.status ?? "confirmed", externalEventId: remote.id };
          return await recordOperationConflict(context.service, context.auth.userId, operation, input, "delete", normalized);
        } catch (refreshError) {
          await releasePendingOperation(context.service, operation).catch(() => undefined);
          throw refreshError;
        }
      }
      if (!(error instanceof GoogleCalendarApiError) || ![404, 410].includes(error.status)) {
        await releasePendingOperation(context.service, operation).catch(() => undefined);
        throw error;
      }
    }
    const { error: finalDeleteError } = await context.service.from("calendar_events").update({ status: "cancelled", sync_state: "synced", pending_action: null, operation_id: null, last_synced_at: new Date().toISOString() }).eq("id", operation.rowId).eq("operation_id", operation.operationId);
    if (finalDeleteError) {
      await releasePendingOperation(context.service, operation).catch(() => undefined);
      throw finalDeleteError;
    }
    return NextResponse.json(await loadCalendarSnapshot(context.service, context.auth.userId));
  } catch (error) {
    return calendarErrorResponse(error);
  }
}

const conflictResolutionSchema = z.discriminatedUnion("winner", [
  z.object({ winner: z.literal("google"), localEventId: z.string().trim().min(8).max(120), conflictId: z.string().uuid() }),
  z.object({ winner: z.literal("mbv"), event: eventInputSchema, conflictId: z.string().uuid() }),
]);

export async function PUT(request: NextRequest) {
  try {
    const context = await calendarContext(request);
    const resolution = conflictResolutionSchema.parse(await request.json());
    if (resolution.winner === "mbv") requireEventDateAccess(context.access, resolution.event);
    const localEventId = resolution.winner === "google" ? resolution.localEventId : resolution.event.localEventId;
    const { data: link, error: linkError } = await context.service.from("calendar_events").select("*").eq("user_id", context.auth.userId).eq("integration_id", context.integration.id).eq("local_event_id", localEventId).maybeSingle();
    if (linkError) throw linkError;
    if (!link) return NextResponse.json({ error: "CALENDAR_EVENT_NOT_LINKED" }, { status: 404 });
    if (link.sync_state !== "conflict" || !link.conflict) {
      return NextResponse.json({ error: "CALENDAR_EVENT_NOT_CONFLICTED" }, { status: 409 });
    }
    const calendar = await writableCalendar(context.service, context.integration.id, link.connected_calendar_id);
    const remoteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${encodeURIComponent(link.external_event_id)}`;
    const operationId = crypto.randomUUID();
    const { data: claimed, error: claimError } = await context.service.rpc("claim_google_calendar_event_operation", {
      p_user_id: context.auth.userId,
      p_integration_id: context.integration.id,
      p_connection_generation: context.integration.connection_generation ?? null,
      p_selection_generation: context.integration.selection_generation,
      p_event_id: link.id,
      p_expected_conflict_id: resolution.conflictId,
      p_operation_id: operationId,
    });
    if (claimError) throw claimError;
    if (claimed !== true) {
      return NextResponse.json({ error: "CALENDAR_CONNECTION_CHANGED", snapshot: await loadCalendarSnapshot(context.service, context.auth.userId) }, { status: 409 });
    }
    const userHash = (await sha256(context.auth.userId)).slice(0, 24);
    try {
      let remote: GoogleEventResource | null = null;
      try {
        remote = await context.google<GoogleEventResource>(remoteUrl);
      } catch (error) {
        if (!(error instanceof GoogleCalendarApiError) || ![404, 410].includes(error.status)) throw error;
      }
      if (resolution.winner === "google") {
        if (remote) {
          await upsertGoogleEvent(context.service, context.integration, calendar, remote, { force: true, expectedOperationId: operationId });
        } else {
          const { error: cancelError } = await context.service.from("calendar_events").update({
            status: "cancelled", sync_state: "synced", pending_action: null, operation_id: null,
            conflict: null, google_updated_at: new Date().toISOString(), last_synced_at: new Date().toISOString(),
          }).eq("id", link.id).eq("operation_id", operationId);
          if (cancelError) throw cancelError;
        }
      } else if (link.pending_action === "delete") {
        if (remote) {
          if (isOwnedGoogleEvent(remote, localEventId, userHash)) {
            if (!remote.etag) throw new GoogleCalendarApiError(409, "ETAG_CONFLICT");
            try {
              await context.google(`${remoteUrl}?sendUpdates=none`, {
                method: "DELETE",
                headers: { "If-Match": remote.etag },
              });
            } catch (error) {
              if (!(error instanceof GoogleCalendarApiError) || ![404, 410].includes(error.status)) throw error;
            }
          }
        }
        const { error: deleteError } = await context.service.from("calendar_events").update({
          status: "cancelled",
          sync_state: "synced",
          pending_action: null,
          operation_id: null,
          conflict: null,
          last_synced_at: new Date().toISOString(),
        }).eq("id", link.id).eq("operation_id", operationId);
        if (deleteError) throw deleteError;
      } else {
        const payload = { ...buildGoogleEventResource(resolution.event, userHash), id: undefined };
        if (remote) {
          if (!isOwnedGoogleEvent(remote, localEventId, userHash)) throw new GoogleCalendarApiError(409, "GOOGLE_EVENT_ID_COLLISION");
          if (!remote.etag) throw new GoogleCalendarApiError(409, "ETAG_CONFLICT");
          const saved = await context.google<GoogleEventResource>(`${remoteUrl}?sendUpdates=none`, {
            method: "PATCH",
            headers: { "If-Match": remote.etag },
            body: JSON.stringify(payload),
          });
          await upsertGoogleEvent(context.service, context.integration, calendar, saved, { force: true, expectedOperationId: operationId });
        } else {
          const recreatedId = googleEventIdForLocal(`${resolution.event.localEventId}${link.external_event_id}`);
          const recreatedUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${encodeURIComponent(recreatedId)}`;
          const recreatedPayload = buildGoogleEventResource(resolution.event, userHash);
          const recreated = await createGoogleEventIdempotently(context, calendar, resolution.event, recreatedId, recreatedPayload, userHash);
          let saved = recreated.resource;
          if (recreated.conflict) {
            if (!saved.etag) throw new GoogleCalendarApiError(409, "ETAG_CONFLICT");
            saved = await context.google<GoogleEventResource>(`${recreatedUrl}?sendUpdates=none`, {
              method: "PATCH",
              headers: { "If-Match": saved.etag },
              body: JSON.stringify({ ...recreatedPayload, id: undefined }),
            });
          }
          const { data: released, error: releaseError } = await context.service.from("calendar_events").update({
            local_event_id: null, status: "cancelled", sync_state: "synced", pending_action: null,
            operation_id: null, conflict: null, last_synced_at: new Date().toISOString(),
          }).eq("id", link.id).eq("operation_id", operationId).select("id").maybeSingle();
          if (releaseError) throw releaseError;
          if (released) await upsertGoogleEvent(context.service, context.integration, calendar, saved, { force: true });
        }
      }
      return NextResponse.json(await loadCalendarSnapshot(context.service, context.auth.userId));
    } catch (error) {
      await releasePendingOperation(context.service, { rowId: link.id, operationId }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return calendarErrorResponse(error);
  }
}
