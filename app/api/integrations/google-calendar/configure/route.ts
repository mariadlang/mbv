import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/src/lib/serverAuth";
import { requireCalendarAccess } from "@/src/server/calendar/access";
import { createCalendarServiceClient, requireCalendarServerConfig } from "@/src/server/calendar/config";
import { calendarErrorResponse } from "@/src/server/calendar/http";
import { accessTokenForIntegration } from "@/src/server/calendar/googleApi";
import { ensureGoogleCalendarWatch, loadCalendarIntegration, loadCalendarSnapshot, loadConnectedCalendars, stopGoogleCalendarWatch, syncGoogleCalendar } from "@/src/server/calendar/sync";

const configurationSchema = z.object({
  visibleCalendarIds: z.array(z.string().uuid()).max(50),
  defaultCalendarId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.e2e) return NextResponse.json({ error: "CALENDAR_NOT_CONFIGURED" }, { status: 503 });
    await requireCalendarAccess(auth.client, auth.userId);
    const input = configurationSchema.parse(await request.json());
    const config = requireCalendarServerConfig();
    const service = createCalendarServiceClient(config);
    const integration = await loadCalendarIntegration(service, auth.userId);
    if (!integration || integration.status !== "connected") return NextResponse.json({ error: "CALENDAR_NOT_CONNECTED" }, { status: 409 });
    const calendars = await loadConnectedCalendars(service, integration.id);
    const ownIds = new Set(calendars.map((calendar) => calendar.id));
    if (!input.visibleCalendarIds.length || input.visibleCalendarIds.some((id) => !ownIds.has(id))) return NextResponse.json({ error: "INVALID_CALENDAR_SELECTION" }, { status: 400 });
    const defaultCalendar = calendars.find((calendar) => calendar.id === input.defaultCalendarId);
    if (!defaultCalendar || !defaultCalendar.is_writable || !input.visibleCalendarIds.includes(defaultCalendar.id)) return NextResponse.json({ error: "INVALID_DEFAULT_CALENDAR" }, { status: 400 });
    const selectedIds = new Set(input.visibleCalendarIds);
    const deselectedCalendars = calendars.filter((calendar) => calendar.is_visible && !selectedIds.has(calendar.id));
    const { error: selectionError } = await service.rpc("configure_google_calendar_selection", {
      p_user_id: auth.userId,
      p_integration_id: integration.id,
      p_connection_generation: integration.connection_generation ?? null,
      p_selection_generation: integration.selection_generation,
      p_visible_calendar_ids: input.visibleCalendarIds,
      p_default_calendar_id: input.defaultCalendarId,
    });
    if (selectionError) throw selectionError;
    const activeIntegration = await loadCalendarIntegration(service, auth.userId);
    if (!activeIntegration || activeIntegration.status !== "connected") {
      return NextResponse.json({ error: "CALENDAR_CONNECTION_CHANGED" }, { status: 409 });
    }
    if (deselectedCalendars.length) {
      try {
        const accessToken = await accessTokenForIntegration(config, service, activeIntegration);
        for (const calendar of deselectedCalendars) await stopGoogleCalendarWatch(accessToken, calendar);
      } catch {
        // The committed selection remains authoritative; stale channels expire automatically.
      }
    }
    for (const calendar of (await loadConnectedCalendars(service, activeIntegration.id)).filter((item) => item.is_visible)) {
      await syncGoogleCalendar(service, config, activeIntegration, calendar).catch(() => undefined);
      await ensureGoogleCalendarWatch(service, config, activeIntegration, calendar).catch(() => undefined);
    }
    return NextResponse.json(await loadCalendarSnapshot(service, auth.userId));
  } catch (error) {
    return calendarErrorResponse(error);
  }
}
