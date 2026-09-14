import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCalendarServiceClient, GOOGLE_CALENDAR_SCOPES, requireCalendarServerConfig, type CalendarServerConfig } from "@/src/server/calendar/config";
import {
  constantTimeEqual,
  decryptServerSecret,
  encryptServerSecret,
  GOOGLE_CALENDAR_COMPLETION_COOKIE,
  GOOGLE_CALENDAR_OAUTH_COOKIE,
  randomOpaqueValue,
  safeReturnPath,
  sha256,
} from "@/src/server/calendar/crypto";
import {
  exchangeGoogleAuthorizationCode,
  googleCalendarList,
  googleUserInfo,
  type CalendarIntegrationRow,
} from "@/src/server/calendar/googleApi";
import { drainGoogleGrantRevocations, googleOAuthPendingPayloadSchema, queueGoogleGrantRevocation, revokeGoogleGrant } from "@/src/server/calendar/oauthCompletion";
import { calendarAccessAllowed } from "@/src/server/calendar/access";

class CalendarOAuthCallbackError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "CalendarOAuthCallbackError";
  }
}

function redirectWithResult(
  baseUrl: string,
  returnTo: string,
  result: "pending" | "error",
  options: { reason?: string; completionToken?: string } = {},
) {
  const target = new URL(safeReturnPath(returnTo), baseUrl);
  target.searchParams.delete("calendar_token");
  target.searchParams.delete("reason");
  target.searchParams.set("calendar", result);
  if (options.reason) target.searchParams.set("reason", options.reason);
  target.hash = "integrations";
  const response = NextResponse.redirect(target);
  response.cookies.set(GOOGLE_CALENDAR_OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/api/integrations/google-calendar/callback",
    maxAge: 0,
  });
  response.cookies.set(GOOGLE_CALENDAR_COMPLETION_COOKIE, options.completionToken ?? "", {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/api/integrations/google-calendar/complete",
    maxAge: options.completionToken ? 10 * 60 : 0,
  });
  return response;
}

function hasRequiredScopes(scope: string | undefined) {
  if (!scope) return false;
  const granted = new Set(scope.split(" ").filter(Boolean));
  const hasEmail = granted.has("email") || granted.has("https://www.googleapis.com/auth/userinfo.email");
  const calendarScopes = GOOGLE_CALENDAR_SCOPES.filter((item) => item.startsWith("https://www.googleapis.com/auth/calendar"));
  return granted.has("openid") && hasEmail && calendarScopes.every((item) => granted.has(item));
}

export async function GET(request: NextRequest) {
  let baseUrl = request.nextUrl.origin;
  let returnTo = "/app/settings";
  let tokenToRevoke = "";
  let pendingPayloadStored = false;
  let config: CalendarServerConfig | null = null;
  let service: SupabaseClient | null = null;
  let revocationSource = "";

  try {
    config = requireCalendarServerConfig();
    baseUrl = config.appBaseUrl;
    const state = request.nextUrl.searchParams.get("state");
    const browserState = request.cookies.get(GOOGLE_CALENDAR_OAUTH_COOKIE)?.value;
    if (!state || !browserState || !constantTimeEqual(browserState, state)) {
      return redirectWithResult(baseUrl, returnTo, "error", { reason: "invalid_state" });
    }

    service = createCalendarServiceClient(config);
    const stateHash = await sha256(state);
    revocationSource = `callback:${stateHash}`;
    const now = new Date().toISOString();
    const { data: oauthState, error: stateError } = await service.from("google_calendar_oauth_states")
      .update({ used_at: now })
      .eq("state_hash", stateHash)
      .is("used_at", null)
      .is("completion_token_hash", null)
      .is("finalized_at", null)
      .gt("expires_at", now)
      .select("*")
      .maybeSingle();
    if (stateError) throw stateError;
    if (!oauthState) return redirectWithResult(baseUrl, returnTo, "error", { reason: "invalid_state" });

    returnTo = safeReturnPath(oauthState.return_to);
    if (request.nextUrl.searchParams.get("error")) {
      return redirectWithResult(baseUrl, returnTo, "error", { reason: "access_denied" });
    }
    const code = request.nextUrl.searchParams.get("code");
    if (!code) throw new CalendarOAuthCallbackError("invalid_callback");
    if (!(await calendarAccessAllowed(service, oauthState.user_id))) {
      throw new CalendarOAuthCallbackError("access_forbidden");
    }

    const verifier = await decryptServerSecret(oauthState.pkce_verifier_ciphertext, config.encryptionKey);
    const token = await exchangeGoogleAuthorizationCode(config, code, verifier);
    // Only a newly issued refresh token represents a durable grant that must be
    // cleaned up. Revoking a short-lived access token can invalidate an older
    // active grant for the same Google account.
    tokenToRevoke = token.refresh_token ?? "";
    if (!hasRequiredScopes(token.scope)) throw new CalendarOAuthCallbackError("missing_scope");

    const googleUser = await googleUserInfo(token.access_token);
    if (!googleUser.sub?.trim() || !googleUser.email?.trim()) throw new CalendarOAuthCallbackError("invalid_account");
    const { data: previous, error: previousError } = await service.from("calendar_integrations")
      .select("*")
      .eq("user_id", oauthState.user_id)
      .eq("provider", "google")
      .maybeSingle();
    if (previousError) throw previousError;
    const typedPrevious = previous as CalendarIntegrationRow | null;
    const sameGoogleAccount = typedPrevious?.account_id === googleUser.sub;
    if (sameGoogleAccount) tokenToRevoke = "";

    let refreshToken = token.refresh_token;
    if (!refreshToken && sameGoogleAccount && typedPrevious) {
      refreshToken = await decryptServerSecret(typedPrevious.refresh_token_ciphertext, config.encryptionKey);
    }
    if (!refreshToken) throw new CalendarOAuthCallbackError("missing_refresh_token");

    const calendars = await googleCalendarList(token.access_token);
    const capturedAt = new Date().toISOString();
    const pendingPayload = googleOAuthPendingPayloadSchema.parse({
      version: 1,
      accountId: googleUser.sub,
      email: googleUser.email,
      accessToken: token.access_token,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + (token.expires_in ?? 3_600) * 1_000).toISOString(),
      scopes: token.scope?.split(" ").filter(Boolean) ?? [],
      calendars: calendars.map((calendar) => ({
        ...calendar,
        summary: calendar.summary?.trim() || calendar.id,
      })),
      capturedAt,
    });
    const completionToken = randomOpaqueValue(32);
    const { data: storedState, error: pendingError } = await service.from("google_calendar_oauth_states")
      .update({
        completion_token_hash: await sha256(completionToken),
        pending_payload_ciphertext: await encryptServerSecret(JSON.stringify(pendingPayload), config.encryptionKey),
        pending_grant_token_ciphertext: token.refresh_token && !sameGoogleAccount
          ? await encryptServerSecret(token.refresh_token, config.encryptionKey)
          : null,
        callback_completed_at: capturedAt,
        expires_at: new Date(Date.now() + 10 * 60 * 1_000).toISOString(),
      })
      .eq("state_hash", stateHash)
      .eq("user_id", oauthState.user_id)
      .is("completion_token_hash", null)
      .is("finalized_at", null)
      .select("state_hash")
      .maybeSingle();
    if (pendingError) throw pendingError;
    if (!storedState) throw new CalendarOAuthCallbackError("invalid_state");
    pendingPayloadStored = true;
    return redirectWithResult(baseUrl, returnTo, "pending", { completionToken });
  } catch (error) {
    if (tokenToRevoke && !pendingPayloadStored) {
      if (service && config && revocationSource) {
        try {
          await queueGoogleGrantRevocation(service, config, tokenToRevoke, revocationSource);
          await drainGoogleGrantRevocations(service, config);
        } catch {
          await revokeGoogleGrant(tokenToRevoke);
        }
      } else {
        await revokeGoogleGrant(tokenToRevoke);
      }
    }
    const reason = error instanceof CalendarOAuthCallbackError ? error.reason : "connection_failed";
    return redirectWithResult(baseUrl, returnTo, "error", { reason });
  }
}
