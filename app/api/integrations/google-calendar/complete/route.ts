import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/src/lib/serverAuth";
import { requireCalendarAccess } from "@/src/server/calendar/access";
import { createCalendarServiceClient, requireCalendarServerConfig, type CalendarServerConfig } from "@/src/server/calendar/config";
import { decryptServerSecret, encryptServerSecret, GOOGLE_CALENDAR_COMPLETION_COOKIE, sha256 } from "@/src/server/calendar/crypto";
import type { CalendarIntegrationRow } from "@/src/server/calendar/googleApi";
import { calendarErrorResponse } from "@/src/server/calendar/http";
import { cleanupGoogleOAuthStates, drainGoogleGrantRevocations, googleOAuthPendingPayloadSchema } from "@/src/server/calendar/oauthCompletion";
import {
  ensureGoogleCalendarWatch,
  loadCalendarIntegration,
  loadCalendarSnapshot,
  loadConnectedCalendars,
  stopGoogleCalendarWatch,
  syncGoogleCalendar,
} from "@/src/server/calendar/sync";

class CalendarCompletionError extends Error {
  constructor(readonly code: string, readonly status = 409, readonly clearCookie = false) {
    super(code);
    this.name = "CalendarCompletionError";
  }
}

interface CompletionClaim {
  userId: string;
  stateHash: string;
  finalizationId: string;
}

function clearCompletionCookie(response: NextResponse, config: CalendarServerConfig) {
  response.cookies.set(GOOGLE_CALENDAR_COMPLETION_COOKIE, "", {
    httpOnly: true,
    secure: config.appBaseUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/api/integrations/google-calendar/complete",
    maxAge: 0,
  });
  return response;
}

async function stopWatchesBestEffort(accessToken: string, calendars: Awaited<ReturnType<typeof loadConnectedCalendars>>) {
  if (!accessToken) return;
  for (const calendar of calendars) await stopGoogleCalendarWatch(accessToken, calendar);
}

export async function POST(request: NextRequest) {
  let config: CalendarServerConfig | null = null;
  let service: SupabaseClient | null = null;
  let claim: CompletionClaim | null = null;

  try {
    const auth = await authenticateRequest(request);
    if (auth.e2e) return NextResponse.json({ error: "CALENDAR_NOT_CONFIGURED" }, { status: 503 });
    await requireCalendarAccess(auth.client, auth.userId);
    config = requireCalendarServerConfig();
    service = createCalendarServiceClient(config);

    const completionToken = request.cookies.get(GOOGLE_CALENDAR_COMPLETION_COOKIE)?.value ?? "";
    if (completionToken.length < 32 || completionToken.length > 500) throw new CalendarCompletionError("INVALID_CALENDAR_COMPLETION", 409, true);

    const completionTokenHash = await sha256(completionToken);
    const finalizationId = crypto.randomUUID();
    const claimedAt = new Date().toISOString();
    const { data: oauthState, error: claimError } = await service.rpc("claim_google_calendar_oauth_completion", {
      p_user_id: auth.userId,
      p_completion_token_hash: completionTokenHash,
      p_finalization_id: finalizationId,
      p_now: claimedAt,
    }).maybeSingle();
    if (claimError) throw claimError;
    const claimedState = oauthState as { state_hash: string; pending_payload_ciphertext: string | null } | null;
    if (!claimedState?.pending_payload_ciphertext) {
      const { data: priorState, error: priorError } = await service.from("google_calendar_oauth_states")
        .select("finalized_at,finalizing_at,expires_at")
        .eq("user_id", auth.userId)
        .eq("completion_token_hash", completionTokenHash)
        .maybeSingle();
      if (priorError) throw priorError;
      if (priorState?.finalized_at) {
        return clearCompletionCookie(NextResponse.json(await loadCalendarSnapshot(service, auth.userId)), config);
      }
      if (priorState?.finalizing_at && new Date(priorState.expires_at).getTime() > Date.now()) {
        throw new CalendarCompletionError("CALENDAR_COMPLETION_IN_PROGRESS", 409, false);
      }
      throw new CalendarCompletionError("INVALID_CALENDAR_COMPLETION", 409, true);
    }
    claim = { userId: auth.userId, stateHash: claimedState.state_hash, finalizationId };

    let pending: z.infer<typeof googleOAuthPendingPayloadSchema>;
    try {
      pending = googleOAuthPendingPayloadSchema.parse(JSON.parse(
        await decryptServerSecret(claimedState.pending_payload_ciphertext, config.encryptionKey),
      ));
    } catch {
      await cleanupGoogleOAuthStates(service, { userId: auth.userId }).catch(() => undefined);
      await drainGoogleGrantRevocations(service, config).catch(() => undefined);
      claim = null;
      throw new CalendarCompletionError("INVALID_CALENDAR_COMPLETION", 409, true);
    }

    const previous = await loadCalendarIntegration(service, auth.userId);
    const sameGoogleAccount = previous?.account_id === pending.accountId;
    const previousCalendars = previous ? await loadConnectedCalendars(service, previous.id) : [];

    if (previous && !sameGoogleAccount) {
      const { data: unsafeSwap, error: unsafeSwapError } = await service.from("calendar_events")
        .select("id")
        .eq("integration_id", previous.id)
        .or("pending_action.not.is.null,sync_state.eq.conflict")
        .limit(1);
      if (unsafeSwapError) throw unsafeSwapError;
      if (unsafeSwap?.length) throw new CalendarCompletionError("CALENDAR_PENDING_CHANGES");
    }

    let previousAccessToken = "";
    if (previous && !sameGoogleAccount) {
      try {
        const usableUntil = previous.token_expires_at ? new Date(previous.token_expires_at).getTime() : 0;
        if (previous.access_token_ciphertext && usableUntil > Date.now()) {
          previousAccessToken = await decryptServerSecret(previous.access_token_ciphertext, config.encryptionKey);
        }
      } catch { /* channels expire even if an old access token cannot be read */ }
    }

    const uniqueRemoteCalendars = [...new Map(pending.calendars.map((calendar) => [calendar.id, calendar])).values()];
    const remoteCalendarIds = new Set(uniqueRemoteCalendars.map((calendar) => calendar.id));
    const removedCalendars = previousCalendars.filter((calendar) => !remoteCalendarIds.has(calendar.external_calendar_id));

    const { data: integration, error: activationError } = await service.rpc("activate_google_calendar_connection", {
      p_user_id: auth.userId,
      p_state_hash: claim.stateHash,
      p_finalization_id: claim.finalizationId,
      p_account_id: pending.accountId,
      p_email: pending.email,
      p_access_token_ciphertext: await encryptServerSecret(pending.accessToken, config.encryptionKey),
      p_refresh_token_ciphertext: await encryptServerSecret(pending.refreshToken, config.encryptionKey),
      p_token_expires_at: pending.tokenExpiresAt,
      p_scopes: pending.scopes,
      p_calendars: uniqueRemoteCalendars,
      p_finalized_at: new Date().toISOString(),
    }).maybeSingle();
    if (activationError) {
      if (activationError.code === "P0001" && activationError.message?.includes("CALENDAR_PENDING_CHANGES")) {
        throw new CalendarCompletionError("CALENDAR_PENDING_CHANGES");
      }
      throw activationError;
    }
    if (!integration) throw new CalendarCompletionError("INVALID_CALENDAR_COMPLETION", 409, true);
    const activeIntegration = integration as CalendarIntegrationRow;
    claim = null;

    const connectedCalendars = await loadConnectedCalendars(service, activeIntegration.id);
    if (!sameGoogleAccount) {
      await stopWatchesBestEffort(previousAccessToken, previousCalendars);
    } else {
      await stopWatchesBestEffort(pending.accessToken, removedCalendars);
    }
    await drainGoogleGrantRevocations(service, config).catch(() => undefined);
    for (const calendar of connectedCalendars.filter((item) => item.is_visible)) {
      await syncGoogleCalendar(service, config, activeIntegration, calendar).catch(() => undefined);
      await ensureGoogleCalendarWatch(service, config, activeIntegration, calendar).catch(() => undefined);
    }

    return clearCompletionCookie(
      NextResponse.json(await loadCalendarSnapshot(service, auth.userId)),
      config,
    );
  } catch (error) {
    if (service && claim) {
      try {
        await service.rpc("release_google_calendar_oauth_completion", {
          p_user_id: claim.userId,
          p_state_hash: claim.stateHash,
          p_finalization_id: claim.finalizationId,
        });
      } catch {
        // The short lease permits a later retry even when release is unavailable.
      }
    }
    if (error instanceof CalendarCompletionError) {
      const response = NextResponse.json({ error: error.code }, { status: error.status });
      return config && error.clearCookie ? clearCompletionCookie(response, config) : response;
    }
    return calendarErrorResponse(error);
  }
}
