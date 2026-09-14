import { describe, expect, it } from "vitest";
import { calendarEventOccursOnDate, calendarEventTimeLabel, dedupeCalendarEvents } from "@/src/domain/calendar";

describe("calendar event domain rules", () => {
  it("treats multi-day ranges as inclusive and ignores cancelled events", () => {
    const activeRange = { startDate: "2026-09-11", endDate: "2026-09-13", status: "confirmed" as const };

    expect(calendarEventOccursOnDate(activeRange, "2026-09-10")).toBe(false);
    expect(calendarEventOccursOnDate(activeRange, "2026-09-11")).toBe(true);
    expect(calendarEventOccursOnDate(activeRange, "2026-09-12")).toBe(true);
    expect(calendarEventOccursOnDate(activeRange, "2026-09-13")).toBe(true);
    expect(calendarEventOccursOnDate(activeRange, "2026-09-14")).toBe(false);
    expect(calendarEventOccursOnDate({ ...activeRange, status: "cancelled" }, "2026-09-12")).toBe(false);
  });

  it("labels all-day and timed events without inventing a time", () => {
    expect(calendarEventTimeLabel({ allDay: true, startTime: "09:00", endTime: "10:00" }, "Todo el día")).toBe("Todo el día");
    expect(calendarEventTimeLabel({ allDay: false }, "Todo el día")).toBe("Todo el día");
    expect(calendarEventTimeLabel({ allDay: false, startTime: "09:00" }, "Todo el día")).toBe("09:00");
    expect(calendarEventTimeLabel({ allDay: false, startTime: "09:00", endTime: "10:30" }, "Todo el día")).toBe("09:00–10:30");
  });

  it("deduplicates by calendar and external event id, keeping the newest Google version", () => {
    const events = [
      { externalCalendarId: "primary", externalEventId: "event-1", googleUpdatedAt: "2026-09-11T10:00:00.000Z", revision: "old" },
      { externalCalendarId: "primary", externalEventId: "event-1", googleUpdatedAt: "2026-09-11T12:00:00.000Z", revision: "new" },
      { externalCalendarId: "shared", externalEventId: "event-1", googleUpdatedAt: "2026-09-11T09:00:00.000Z", revision: "other-calendar" },
    ];

    expect(dedupeCalendarEvents(events)).toEqual([
      expect.objectContaining({ externalCalendarId: "primary", revision: "new" }),
      expect.objectContaining({ externalCalendarId: "shared", revision: "other-calendar" }),
    ]);
  });
});
