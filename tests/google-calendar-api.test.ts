import { describe, expect, it } from "vitest";
import { buildGoogleEventResource, GoogleCalendarApiError, googleEventContentMatchesInput, googleEventIdForLocal, isOwnedGoogleEvent, normalizeGoogleEvent, requireStoredGoogleEtag } from "@/src/server/calendar/googleApi";
import { googleEventSyncPayload } from "@/src/server/calendar/sync";

describe("Google Calendar event normalization", () => {
  it("normalizes a single all-day event and converts Google's exclusive end date", () => {
    const event = normalizeGoogleEvent({
      id: "google-all-day",
      summary: "Día personal",
      start: { date: "2026-09-11" },
      end: { date: "2026-09-12" },
    }, "America/Bogota");

    expect(event).toMatchObject({
      externalEventId: "google-all-day",
      title: "Día personal",
      startDate: "2026-09-11",
      timezone: "America/Bogota",
      allDay: true,
      recurrence: [],
      status: "confirmed",
      origin: "google",
    });
    expect(event?.endDate).toBeUndefined();
    expect(event?.startTime).toBeUndefined();
    expect(event?.endTime).toBeUndefined();
  });

  it("keeps the inclusive final day for a multi-day all-day event", () => {
    const event = normalizeGoogleEvent({
      id: "google-trip",
      summary: "Viaje",
      start: { date: "2026-09-11" },
      end: { date: "2026-09-15" },
      recurrence: ["RRULE:FREQ=YEARLY"],
    }, "UTC");

    expect(event).toMatchObject({
      startDate: "2026-09-11",
      endDate: "2026-09-14",
      allDay: true,
      recurrence: ["RRULE:FREQ=YEARLY"],
    });
  });

  it("preserves local clock values, timezone and absolute instants for a timed multi-day event", () => {
    const event = normalizeGoogleEvent({
      id: "google-overnight",
      summary: "Guardia",
      start: { dateTime: "2026-09-11T23:30:00-05:00", timeZone: "America/Bogota" },
      end: { dateTime: "2026-09-12T01:15:00-05:00", timeZone: "America/Bogota" },
      extendedProperties: { private: { mbvLocalEventId: "local-1", mbvOrigin: "mbv", mbvUser: "user-hash" } },
    }, "UTC", "user-hash");

    expect(event).toMatchObject({
      localEventId: "local-1",
      startDate: "2026-09-11",
      endDate: "2026-09-12",
      startTime: "23:30",
      endTime: "01:15",
      startAt: "2026-09-12T04:30:00.000Z",
      endAt: "2026-09-12T06:15:00.000Z",
      timezone: "America/Bogota",
      allDay: false,
      origin: "mbv",
    });
  });

  it("converts a UTC instant into the event IANA timezone", () => {
    const event = normalizeGoogleEvent({
      id: "google-bogota",
      start: { dateTime: "2026-09-12T04:30:00Z", timeZone: "America/Bogota" },
      end: { dateTime: "2026-09-12T05:30:00Z", timeZone: "America/Bogota" },
    }, "UTC");

    expect(event).toMatchObject({ startDate: "2026-09-11", endDate: "2026-09-12", startTime: "23:30", endTime: "00:30" });
  });

  it("uses the correct local clock across a daylight-saving transition", () => {
    const event = normalizeGoogleEvent({
      id: "google-new-york-dst",
      start: { dateTime: "2026-11-01T05:30:00Z", timeZone: "America/New_York" },
      end: { dateTime: "2026-11-01T07:30:00Z", timeZone: "America/New_York" },
    }, "UTC");

    expect(event).toMatchObject({ startDate: "2026-11-01", startTime: "01:30", endTime: "02:30", timezone: "America/New_York" });
  });

  it("rejects resources without an id or start date", () => {
    expect(normalizeGoogleEvent({ id: "", start: { date: "2026-09-11" } }, "UTC")).toBeNull();
    expect(normalizeGoogleEvent({ id: "missing-date" }, "UTC")).toBeNull();
  });

  it("does not adopt local ownership metadata unless every marker matches the user", () => {
    const event = normalizeGoogleEvent({
      id: "untrusted-markers",
      start: { date: "2026-09-11" },
      end: { date: "2026-09-12" },
      extendedProperties: { private: { mbvLocalEventId: "local-1", mbvOrigin: "mbv", mbvUser: "another-user" } },
    }, "UTC", "user-hash");
    expect(event).toMatchObject({ origin: "google" });
    expect(event).not.toHaveProperty("localEventId");
  });
});

describe("Google Calendar write payloads", () => {
  it("builds an all-day payload with an exclusive Google end date and MBV ownership metadata", () => {
    const resource = buildGoogleEventResource({
      localEventId: "Local-Event_42",
      title: "Retiro",
      description: "Tiempo de recuperación",
      startDate: "2026-09-11",
      endDate: "2026-09-13",
      timezone: "America/Bogota",
      allDay: true,
      connectedCalendarId: "calendar-primary",
    }, "user-hash");

    expect(resource).toMatchObject({
      id: "mbvlocalevent42",
      summary: "Retiro",
      description: "Tiempo de recuperación",
      start: { date: "2026-09-11" },
      end: { date: "2026-09-14" },
      extendedProperties: { private: { mbvLocalEventId: "Local-Event_42", mbvOrigin: "mbv", mbvUser: "user-hash" } },
    });
  });

  it("builds timed start and end values in the selected IANA timezone", () => {
    const resource = buildGoogleEventResource({
      localEventId: "event-overnight",
      title: "Vuelo",
      startDate: "2026-09-11",
      endDate: "2026-09-12",
      startTime: "23:30",
      endTime: "01:15",
      timezone: "America/Bogota",
      allDay: false,
      connectedCalendarId: "calendar-primary",
    }, "user-hash");

    expect(resource.start).toEqual({ dateTime: "2026-09-11T23:30:00", timeZone: "America/Bogota" });
    expect(resource.end).toEqual({ dateTime: "2026-09-12T01:15:00", timeZone: "America/Bogota" });
  });

  it("creates deterministic Google-compatible ids from local ids", () => {
    expect(googleEventIdForLocal("Event_ABC-123")).toBe("mbveventabc123");
    expect(googleEventIdForLocal("Event_ABC-123")).toBe(googleEventIdForLocal("Event_ABC-123"));
  });

  it("only adopts a duplicate event carrying the exact MBV ownership markers", () => {
    const owned = { id: "remote", extendedProperties: { private: { mbvOrigin: "mbv", mbvLocalEventId: "local-1", mbvUser: "user-hash" } } };
    expect(isOwnedGoogleEvent(owned, "local-1", "user-hash")).toBe(true);
    expect(isOwnedGoogleEvent(owned, "local-2", "user-hash")).toBe(false);
    expect(isOwnedGoogleEvent(owned, "local-1", "other-user")).toBe(false);
    expect(isOwnedGoogleEvent({ id: "remote" }, "local-1", "user-hash")).toBe(false);
  });

  it("accepts an idempotent duplicate only while its Google content still matches", () => {
    const input = {
      localEventId: "local-1",
      title: "Revisión semanal",
      description: "Preparar el lunes",
      startDate: "2026-09-14",
      startTime: "09:00",
      endTime: "10:00",
      timezone: "America/Bogota",
      allDay: false,
      connectedCalendarId: "calendar-primary",
    };
    const resource = {
      ...buildGoogleEventResource(input, "user-hash"),
      id: "remote",
      etag: "etag-2",
      status: "confirmed" as const,
      start: { dateTime: "2026-09-14T09:00:00-05:00", timeZone: "America/Bogota" },
      end: { dateTime: "2026-09-14T10:00:00-05:00", timeZone: "America/Bogota" },
    };

    expect(googleEventContentMatchesInput(resource, input, "user-hash")).toBe(true);
    expect(googleEventContentMatchesInput({ ...resource, summary: "Cambio hecho en Google" }, input, "user-hash")).toBe(false);
    expect(googleEventContentMatchesInput({ ...resource, recurrence: ["RRULE:FREQ=WEEKLY"] }, input, "user-hash")).toBe(false);
    expect(googleEventContentMatchesInput(resource, input, "another-user")).toBe(false);
  });

  it("uses the stored ETag and rejects missing or stale client versions", () => {
    expect(requireStoredGoogleEtag("etag-2", "etag-2")).toBe("etag-2");
    expect(() => requireStoredGoogleEtag("etag-2", undefined)).toThrowError(GoogleCalendarApiError);
    expect(() => requireStoredGoogleEtag("etag-2", "etag-1")).toThrow("ETAG_CONFLICT");
    expect(() => requireStoredGoogleEtag(undefined, "etag-1")).toThrow("ETAG_CONFLICT");
  });
});

describe("Google Calendar incremental sync payloads", () => {
  it("keeps a cancellation tombstone even when Google omits its dates", () => {
    expect(googleEventSyncPayload({ id: "deleted-event", status: "cancelled", etag: "etag-2" }, "UTC", "user-hash")).toMatchObject({
      externalEventId: "deleted-event",
      status: "cancelled",
      tombstone: true,
      etag: "etag-2",
    });
  });

  it("does not duplicate a copied MBV local id across expanded recurrence instances", () => {
    const payload = googleEventSyncPayload({
      id: "series-instance-20260911",
      recurringEventId: "series-master",
      start: { dateTime: "2026-09-11T09:00:00-05:00", timeZone: "America/Bogota" },
      end: { dateTime: "2026-09-11T10:00:00-05:00", timeZone: "America/Bogota" },
      extendedProperties: { private: { mbvLocalEventId: "local-series", mbvOrigin: "mbv", mbvUser: "user-hash" } },
    }, "UTC", "user-hash");

    expect(payload).toMatchObject({ externalEventId: "series-instance-20260911", recurringEventId: "series-master" });
    expect(payload).not.toHaveProperty("localEventId");
  });
});
