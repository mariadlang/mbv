import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/src/lib/serverAuth";
import { createCalendarServiceClient, requireCalendarServerConfig } from "@/src/server/calendar/config";
import { decryptServerSecret, GOOGLE_CALENDAR_COMPLETION_COOKIE, GOOGLE_CALENDAR_OAUTH_COOKIE } from "@/src/server/calendar/crypto";
import { calendarErrorResponse } from "@/src/server/calendar/http";
import { loadCalendarIntegration, loadConnectedCalendars, stopGoogleCalendarWatch } from "@/src/server/calendar/sync";
import { drainGoogleGrantRevocations } from "@/src/server/calendar/oauthCompletion";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.e2e) return NextResponse.json({ configured: false, integration: null, calendars: [], events: [] });
    const config = requireCalendarServerConfig();
    const service = createCalendarServiceClient(config);
    const integration = await loadCalendarIntegration(service, auth.userId);
    if (integration) {
      let accessToken = "";
      try {
        const usableUntil = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
        if (integration.access_token_ciphertext && usableUntil > Date.now()) {
          accessToken = await decryptServerSecret(integration.access_token_ciphertext, config.encryptionKey);
        }
      } catch {
        // Revoking the durable grant remains sufficient when the access token is unavailable.
      }
      const calendars = await loadConnectedCalendars(service, integration.id);
      const { data: disconnected, error } = await service.rpc("disconnect_google_calendar_connection", {
        p_user_id: auth.userId,
        p_connection_generation: integration.connection_generation ?? null,
      });
      if (error) throw error;
      if (disconnected !== true && await loadCalendarIntegration(service, auth.userId)) {
        return NextResponse.json({ error: "CALENDAR_CONNECTION_CHANGED" }, { status: 409 });
      }
      if (disconnected === true && accessToken) {
        for (const calendar of calendars) await stopGoogleCalendarWatch(accessToken, calendar);
      }
    } else {
      const { error } = await service.rpc("cleanup_google_calendar_oauth_states", {
        p_user_id: auth.userId,
        p_expired_before: null,
      });
      if (error) throw error;
    }
    await drainGoogleGrantRevocations(service, config).catch(() => undefined);
    const response = NextResponse.json({ configured: true, integration: null, calendars: [], events: [] });
    for (const cookie of [
      { name: GOOGLE_CALENDAR_OAUTH_COOKIE, path: "/api/integrations/google-calendar/callback" },
      { name: GOOGLE_CALENDAR_COMPLETION_COOKIE, path: "/api/integrations/google-calendar/complete" },
    ]) response.cookies.set(cookie.name, "", { httpOnly: true, secure: config.appBaseUrl.startsWith("https://"), sameSite: "lax", path: cookie.path, maxAge: 0 });
    return response;
  } catch (error) {
    return calendarErrorResponse(error);
  }
}
