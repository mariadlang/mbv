import { NextRequest, NextResponse } from "next/server";
import { createCalendarServiceClient, requireCalendarServerConfig } from "@/src/server/calendar/config";
import { constantTimeEqual } from "@/src/server/calendar/crypto";
import { cleanupGoogleOAuthStates, drainGoogleGrantRevocations } from "@/src/server/calendar/oauthCompletion";
import { calendarFeatureDisabledResponse } from "@/src/server/calendar/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const disabled = calendarFeatureDisabledResponse({ acknowledge: true });
  if (disabled) return disabled;
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length < 32) {
    return NextResponse.json({ error: "CALENDAR_MAINTENANCE_NOT_CONFIGURED" }, { status: 503 });
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!constantTimeEqual(authorization, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const config = requireCalendarServerConfig();
    const service = createCalendarServiceClient(config);
    await cleanupGoogleOAuthStates(service, { expiredBefore: new Date().toISOString() });
    await drainGoogleGrantRevocations(service, config);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Google Calendar maintenance failed", error);
    return NextResponse.json({ error: "CALENDAR_MAINTENANCE_FAILED" }, { status: 500 });
  }
}
