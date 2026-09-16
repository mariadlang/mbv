import { NextRequest, NextResponse } from "next/server";
import { calendarAccessAllowed } from "@/src/server/calendar/access";
import { createCalendarServiceClient, getCalendarServerConfig } from "@/src/server/calendar/config";
import { constantTimeEqual, sha256 } from "@/src/server/calendar/crypto";
import { GoogleCalendarApiError, type ConnectedCalendarRow } from "@/src/server/calendar/googleApi";
import { loadCalendarIntegration, syncGoogleCalendar } from "@/src/server/calendar/sync";
import { calendarFeatureDisabledResponse } from "@/src/server/calendar/http";

const RETRY_HEADERS = { "Retry-After": "5" };

function retryableFailure() {
  return new NextResponse(null, { status: 503, headers: RETRY_HEADERS });
}

function invalidChannel() {
  return new NextResponse(null, { status: 404 });
}

export async function POST(request: NextRequest) {
  const disabled = calendarFeatureDisabledResponse({ acknowledge: true });
  if (disabled) return disabled;
  const config = getCalendarServerConfig();
  if (!config) return retryableFailure();

  const channelId = request.headers.get("x-goog-channel-id") ?? "";
  const resourceId = request.headers.get("x-goog-resource-id") ?? "";
  const channelToken = request.headers.get("x-goog-channel-token") ?? "";
  const messageNumber = request.headers.get("x-goog-message-number") ?? "";
  if (!channelId || !resourceId || !channelToken || !/^\d{1,40}$/.test(messageNumber)) return invalidChannel();

  const service = createCalendarServiceClient(config);
  const { data, error } = await service.from("connected_calendars")
    .select("*")
    .eq("channel_id", channelId)
    .eq("channel_resource_id", resourceId)
    .maybeSingle();
  if (error) return retryableFailure();
  if (!data?.channel_token_hash || !constantTimeEqual(data.channel_token_hash, await sha256(channelToken))) return invalidChannel();

  const calendar = data as ConnectedCalendarRow;
  let integration;
  try {
    integration = await loadCalendarIntegration(service, calendar.user_id);
  } catch {
    return retryableFailure();
  }
  if (!integration || integration.id !== calendar.integration_id || integration.status !== "connected" || !calendar.is_visible) {
    return new NextResponse(null, { status: 204 });
  }
  try {
    if (!(await calendarAccessAllowed(service, calendar.user_id))) return new NextResponse(null, { status: 204 });
  } catch {
    return retryableFailure();
  }

  const { data: queued, error: enqueueError } = await service.rpc("enqueue_google_calendar_webhook_sync", {
    p_channel_id: channelId,
    p_resource_id: resourceId,
    p_channel_token_hash: await sha256(channelToken),
    p_message_number: messageNumber,
  }).maybeSingle();
  if (enqueueError) return retryableFailure();
  const queuedRequest = queued as { calendar_id: string; request_id: string | null } | null;
  if (!queuedRequest) return invalidChannel();
  if (!queuedRequest.request_id) return new NextResponse(null, { status: 204 });

  for (let pass = 0; pass < 3; pass += 1) {
    const { data: claim, error: claimError } = await service.rpc("claim_google_calendar_sync", { p_calendar_id: calendar.id }).maybeSingle();
    if (claimError) return retryableFailure();
    // Another invocation owns a valid lease. The request is already durable.
    const syncClaim = claim as { claim_id: string; request_id: string } | null;
    if (!syncClaim) return new NextResponse(null, { status: 204 });

    try {
      const { data: currentCalendar, error: reloadError } = await service.from("connected_calendars").select("*").eq("id", calendar.id).maybeSingle();
      if (reloadError) throw reloadError;
      const currentIntegration = currentCalendar ? await loadCalendarIntegration(service, calendar.user_id) : null;
      if (!currentCalendar || !currentIntegration || currentIntegration.id !== currentCalendar.integration_id || currentIntegration.status !== "connected") {
        const { error: completeError } = await service.rpc("complete_google_calendar_sync", {
          p_calendar_id: calendar.id,
          p_claim_id: syncClaim.claim_id,
          p_request_id: syncClaim.request_id,
        });
        if (completeError) throw completeError;
        return new NextResponse(null, { status: 204 });
      }

      await syncGoogleCalendar(service, config, currentIntegration, currentCalendar as ConnectedCalendarRow);
      const { error: completeError } = await service.rpc("complete_google_calendar_sync", {
        p_calendar_id: calendar.id,
        p_claim_id: syncClaim.claim_id,
        p_request_id: syncClaim.request_id,
      });
      if (completeError) throw completeError;

      const { data: pending, error: pendingError } = await service.from("connected_calendars").select("sync_request_id").eq("id", calendar.id).maybeSingle();
      if (pendingError) throw pendingError;
      if (!pending?.sync_request_id) return new NextResponse(null, { status: 204 });
    } catch (caught) {
      const errorCode = caught instanceof GoogleCalendarApiError ? caught.code : "WEBHOOK_SYNC_FAILED";
      const [{ error: releaseError }, { error: integrationError }] = await Promise.all([
        service.rpc("release_google_calendar_sync", {
          p_calendar_id: calendar.id,
          p_claim_id: syncClaim.claim_id,
          p_request_id: syncClaim.request_id,
          p_error_code: errorCode,
        }),
        service.from("calendar_integrations").update({
          last_error_code: errorCode,
          ...(caught instanceof GoogleCalendarApiError && [401, 403].includes(caught.status) ? { status: "reconnect_required" } : {}),
        }).eq("id", integration.id),
      ]);
      if (releaseError || integrationError) return retryableFailure();
      return retryableFailure();
    }
  }

  // A continuous stream generated a newer request during every pass. Keep it
  // queued and ask Google to retry instead of acknowledging unfinished work.
  return retryableFailure();
}
