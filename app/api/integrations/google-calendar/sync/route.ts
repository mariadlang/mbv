import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/src/lib/serverAuth";
import { requireCalendarAccess } from "@/src/server/calendar/access";
import { createCalendarServiceClient, requireCalendarServerConfig } from "@/src/server/calendar/config";
import { calendarErrorResponse } from "@/src/server/calendar/http";
import { ensureGoogleCalendarWatch, loadCalendarIntegration, loadCalendarSnapshot, loadConnectedCalendars, syncGoogleCalendar } from "@/src/server/calendar/sync";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.e2e) return NextResponse.json({ configured: false, integration: null, calendars: [], events: [] });
    await requireCalendarAccess(auth.client, auth.userId);
    const config = requireCalendarServerConfig();
    const service = createCalendarServiceClient(config);
    const integration = await loadCalendarIntegration(service, auth.userId);
    if (!integration || integration.status !== "connected") return NextResponse.json(await loadCalendarSnapshot(service, auth.userId));
    for (const calendar of (await loadConnectedCalendars(service, integration.id)).filter((item) => item.is_visible)) {
      const { data: requestId, error: enqueueError } = await service.rpc("enqueue_google_calendar_manual_sync", { p_calendar_id: calendar.id });
      if (enqueueError) throw enqueueError;
      if (!requestId) continue;
      const { data: claim, error: claimError } = await service.rpc("claim_google_calendar_sync", { p_calendar_id: calendar.id }).maybeSingle();
      if (claimError) throw claimError;
      const syncClaim = claim as { claim_id: string; request_id: string } | null;
      if (!syncClaim) continue;
      try {
        await syncGoogleCalendar(service, config, integration, calendar);
        const { error: completeError } = await service.rpc("complete_google_calendar_sync", {
          p_calendar_id: calendar.id,
          p_claim_id: syncClaim.claim_id,
          p_request_id: syncClaim.request_id,
        });
        if (completeError) throw completeError;
        await ensureGoogleCalendarWatch(service, config, integration, calendar).catch(() => undefined);
      } catch (error) {
        await service.rpc("release_google_calendar_sync", {
          p_calendar_id: calendar.id,
          p_claim_id: syncClaim.claim_id,
          p_request_id: syncClaim.request_id,
          p_error_code: error instanceof Error ? error.message : "SYNC_FAILED",
        });
        throw error;
      }
    }
    return NextResponse.json(await loadCalendarSnapshot(service, auth.userId));
  } catch (error) {
    return calendarErrorResponse(error);
  }
}
