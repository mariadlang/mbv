import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/src/lib/serverAuth";
import { requireCalendarAccess } from "@/src/server/calendar/access";
import { calendarErrorResponse, calendarFeatureDisabledResponse } from "@/src/server/calendar/http";
import { createCalendarServiceClient, GOOGLE_CALENDAR_SCOPES, requireCalendarServerConfig } from "@/src/server/calendar/config";
import { encryptServerSecret, GOOGLE_CALENDAR_COMPLETION_COOKIE, GOOGLE_CALENDAR_OAUTH_COOKIE, randomOpaqueValue, safeReturnPath, sha256 } from "@/src/server/calendar/crypto";
import { googleAuthorizationUrl } from "@/src/server/calendar/googleApi";
import { cleanupGoogleOAuthStates, drainGoogleGrantRevocations } from "@/src/server/calendar/oauthCompletion";

const requestSchema = z.object({ returnTo: z.string().max(500).optional() });

export async function POST(request: NextRequest) {
  const disabled = calendarFeatureDisabledResponse();
  if (disabled) return disabled;
  try {
    const auth = await authenticateRequest(request);
    if (auth.e2e) return NextResponse.json({ error: "CALENDAR_NOT_CONFIGURED" }, { status: 503 });
    await requireCalendarAccess(auth.client, auth.userId);
    const input = requestSchema.parse(await request.json().catch(() => ({})));
    const config = requireCalendarServerConfig();
    const service = createCalendarServiceClient(config);
    await cleanupGoogleOAuthStates(service, { expiredBefore: new Date().toISOString() });
    const state = randomOpaqueValue(32);
    const verifier = randomOpaqueValue(64);
    const challenge = await sha256(verifier);
    const { error } = await service.rpc("rotate_google_calendar_oauth_state", {
      p_user_id: auth.userId,
      p_state_hash: await sha256(state),
      p_pkce_verifier_ciphertext: await encryptServerSecret(verifier, config.encryptionKey),
      p_return_to: safeReturnPath(input.returnTo),
      p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw error;
    await drainGoogleGrantRevocations(service, config).catch(() => undefined);
    const response = NextResponse.json({ authorizationUrl: googleAuthorizationUrl(config, state, challenge, GOOGLE_CALENDAR_SCOPES) });
    response.cookies.set(GOOGLE_CALENDAR_OAUTH_COOKIE, state, {
      httpOnly: true,
      secure: config.appBaseUrl.startsWith("https://"),
      sameSite: "lax",
      path: "/api/integrations/google-calendar/callback",
      maxAge: 10 * 60,
    });
    response.cookies.set(GOOGLE_CALENDAR_COMPLETION_COOKIE, "", {
      httpOnly: true,
      secure: config.appBaseUrl.startsWith("https://"),
      sameSite: "lax",
      path: "/api/integrations/google-calendar/complete",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return calendarErrorResponse(error);
  }
}
