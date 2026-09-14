import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/src/domain/calendar";
import type { PlannerEvent } from "@/src/domain/planner";
import { reconcilePlannerCalendarEvents } from "@/src/services/plannerService";

const timestamp = "2026-09-11T12:00:00.000Z";

function linkedEvent(pendingAction: "create" | "update" | "delete"): PlannerEvent {
  return {
    id: `local-${pendingAction}`,
    title: `Evento ${pendingAction}`,
    startDate: "2026-09-12",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    timezone: "America/Bogota",
    category: "personal",
    status: "confirmed",
    calendarProvider: "google",
    integrationId: "integration-current",
    connectedCalendarId: "calendar-visible",
    externalCalendarId: "primary",
    externalEventId: `google-${pendingAction}`,
    calendarName: "Principal",
    origin: "mbv",
    syncState: pendingAction === "create" ? "pending" : pendingAction === "update" ? "error" : "conflict",
    pendingAction,
    etag: `etag-${pendingAction}`,
    lastSyncedAt: timestamp,
    googleUpdatedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function remoteEvent(local: PlannerEvent): CalendarEvent {
  return {
    id: `remote-row-${local.id}`,
    integrationId: local.integrationId as string,
    connectedCalendarId: local.connectedCalendarId as string,
    externalCalendarId: local.externalCalendarId as string,
    externalEventId: local.externalEventId as string,
    localEventId: local.id,
    calendarName: local.calendarName as string,
    title: "Título remoto obsoleto",
    startDate: local.startDate,
    startTime: local.startTime,
    endTime: local.endTime,
    timezone: local.timezone as string,
    allDay: false,
    recurrence: [],
    status: "confirmed",
    origin: "mbv",
    etag: "etag-remote",
    lastSyncedAt: timestamp,
    syncState: "synced",
  };
}

function expectDetached(event: PlannerEvent, original: PlannerEvent) {
  expect(event).toMatchObject({
    id: original.id,
    title: original.title,
    origin: "mbv",
    syncState: "local",
    status: "confirmed",
  });
  for (const key of [
    "calendarProvider",
    "integrationId",
    "connectedCalendarId",
    "externalCalendarId",
    "externalEventId",
    "calendarName",
    "pendingAction",
    "etag",
    "lastSyncedAt",
    "googleUpdatedAt",
  ]) expect(event).not.toHaveProperty(key);
}

describe("planner Google Calendar reconciliation", () => {
  const pendingActions = ["create", "update", "delete"] as const;

  it.each(pendingActions)("detaches a pending %s when there is no active integration", (pendingAction) => {
    const local = linkedEvent(pendingAction);
    const [result] = reconcilePlannerCalendarEvents([local], [remoteEvent(local)], {
      integrationId: null,
      visibleCalendarIds: [],
    });

    expectDetached(result, local);
  });

  it.each(pendingActions)("detaches a pending %s when the active integration changed", (pendingAction) => {
    const local = linkedEvent(pendingAction);
    const [result] = reconcilePlannerCalendarEvents([local], [remoteEvent(local)], {
      integrationId: "integration-replacement",
      visibleCalendarIds: ["calendar-visible"],
    });

    expectDetached(result, local);
  });

  it.each(pendingActions)("detaches a pending %s when its calendar is no longer visible", (pendingAction) => {
    const local = linkedEvent(pendingAction);
    const [result] = reconcilePlannerCalendarEvents([local], [remoteEvent(local)], {
      integrationId: "integration-current",
      visibleCalendarIds: [],
    });

    expectDetached(result, local);
  });

  it.each(pendingActions)("keeps a pending %s linked only to the same active visible calendar", (pendingAction) => {
    const local = linkedEvent(pendingAction);
    const [result] = reconcilePlannerCalendarEvents([local], [], {
      integrationId: "integration-current",
      visibleCalendarIds: ["calendar-visible"],
    });

    expect(result).toEqual(local);
  });

  it("treats an omitted connection as no active integration", () => {
    const local = linkedEvent("update");
    const [result] = reconcilePlannerCalendarEvents([local], [remoteEvent(local)]);

    expectDetached(result, local);
  });
});
