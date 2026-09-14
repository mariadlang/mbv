import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/src/lib/serverAuth";
import { requireCalendarAccess } from "@/src/server/calendar/access";
import { createCalendarServiceClient, getCalendarServerConfig } from "@/src/server/calendar/config";
import { calendarErrorResponse } from "@/src/server/calendar/http";
import { loadCalendarSnapshot } from "@/src/server/calendar/sync";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.e2e) await requireCalendarAccess(auth.client, auth.userId);
    const config = getCalendarServerConfig();
    if (!config || auth.e2e) return NextResponse.json({ configured: false, integration: null, calendars: [], events: [] });
    return NextResponse.json(await loadCalendarSnapshot(createCalendarServiceClient(config), auth.userId));
  } catch (error) {
    return calendarErrorResponse(error);
  }
}
