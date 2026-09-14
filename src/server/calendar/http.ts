import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CalendarConfigurationError } from "@/src/server/calendar/config";
import { GoogleCalendarApiError } from "@/src/server/calendar/googleApi";

export function calendarErrorResponse(error: unknown) {
  if (error instanceof Response) return error;
  if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_CALENDAR_REQUEST" }, { status: 400 });
  if (error instanceof CalendarConfigurationError) return NextResponse.json({ error: "CALENDAR_NOT_CONFIGURED" }, { status: 503 });
  if (error instanceof GoogleCalendarApiError) {
    const status = error.code === "RECONNECT_REQUIRED" || error.code === "GOOGLE_UNAUTHORIZED"
      ? 401
      : error.code === "ETAG_CONFLICT"
        ? 409
        : error.code === "RATE_LIMITED"
          ? 429
          : error.status >= 400 && error.status < 500
            ? error.status
            : 502;
    return NextResponse.json({ error: error.code }, { status });
  }
  if (error && typeof error === "object") {
    const message = "message" in error && typeof error.message === "string" ? error.message : "";
    const databaseCode = [
      "CALENDAR_PENDING_CHANGES",
      "CALENDAR_CONNECTION_CHANGED",
      "INVALID_CALENDAR_COMPLETION",
      "INVALID_CALENDAR_SELECTION",
      "INVALID_DEFAULT_CALENDAR",
      "INVALID_CALENDAR_LIST",
      "INVALID_CALENDAR_OPERATION",
      "CALENDAR_NOT_WRITABLE",
      "GOOGLE_EVENT_ID_COLLISION",
      "CALENDAR_EVENT_OPERATION_IN_PROGRESS",
      "CALENDAR_EVENT_NOT_LINKED",
    ].find((candidate) => message.includes(candidate));
    if (databaseCode) {
      const status = databaseCode === "CALENDAR_EVENT_NOT_LINKED"
        ? 404
        : ["CALENDAR_PENDING_CHANGES", "CALENDAR_CONNECTION_CHANGED", "INVALID_CALENDAR_COMPLETION", "GOOGLE_EVENT_ID_COLLISION", "CALENDAR_EVENT_OPERATION_IN_PROGRESS"].includes(databaseCode)
          ? 409
          : 400;
      return NextResponse.json({ error: databaseCode }, { status });
    }
  }
  return NextResponse.json({ error: "CALENDAR_REQUEST_FAILED" }, { status: 500 });
}
