import { describe, expect, it } from "vitest";
import { calendarSyncStateForError } from "@/src/hooks/useCalendarIntegration";
import { CalendarHttpError } from "@/src/repositories/http/HttpGoogleCalendarRepository";

describe("calendar client error states", () => {
  it("only treats an ETag conflict as a resolvable conflict", () => {
    expect(calendarSyncStateForError(new CalendarHttpError(409, "ETAG_CONFLICT"))).toBe("conflict");
    expect(calendarSyncStateForError(new CalendarHttpError(409, "CALENDAR_CONNECTION_CHANGED"))).toBe("pending");
    expect(calendarSyncStateForError(new CalendarHttpError(409, "CALENDAR_NOT_CONNECTED"))).toBe("reconnect_required");
  });

  it("keeps transport failures queued and marks authorization failures for reconnection", () => {
    expect(calendarSyncStateForError(new TypeError("Failed to fetch"))).toBe("pending");
    expect(calendarSyncStateForError(new CalendarHttpError(401, "RECONNECT_REQUIRED"))).toBe("reconnect_required");
    expect(calendarSyncStateForError(new CalendarHttpError(429, "RATE_LIMITED"))).toBe("error");
  });
});
