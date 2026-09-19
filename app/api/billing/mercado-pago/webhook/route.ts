import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBillingServiceClient, requireBillingServerConfig } from "@/src/server/billing/config";
import { billingErrorResponse } from "@/src/server/billing/http";
import { MercadoPagoClient } from "@/src/server/billing/mercadoPagoClient";
import {
  isMercadoPagoBillingTopic,
  loadProviderBillingSnapshot,
} from "@/src/server/billing/reconciliation";
import { SupabaseBillingPersistence } from "@/src/server/billing/repository";
import { verifyMercadoPagoWebhookSignature } from "@/src/server/billing/webhookSignature";

const eventIdentifier = z.union([
  z.string().min(1).max(160),
  z.number().int().nonnegative(),
]).transform(String);
const resourceIdentifier = z.union([
  z.string().min(1).max(200),
  z.number().int().nonnegative(),
]).transform(String);

const webhookSchema = z.object({
  id: eventIdentifier,
  type: z.string().min(1).max(100),
  action: z.string().min(1).max(120),
  api_version: z.string().max(30).optional(),
  date_created: z.string().datetime({ offset: true }),
  live_mode: z.boolean(),
  data: z.object({ id: resourceIdentifier }),
}).passthrough();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const config = requireBillingServerConfig();
    const dataId = request.nextUrl.searchParams.get("data.id") ?? "";
    const queryType = request.nextUrl.searchParams.get("type") ?? "";
    const requestId = request.headers.get("x-request-id") ?? "";
    const signature = request.headers.get("x-signature") ?? "";
    if (!await verifyMercadoPagoWebhookSignature({
      dataId,
      requestId,
      signature,
      secret: config.mercadoPagoWebhookSecret,
    })) return NextResponse.json({ error: "INVALID_WEBHOOK_SIGNATURE" }, { status: 401 });

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > 64 * 1024) {
      return NextResponse.json({ error: "WEBHOOK_TOO_LARGE" }, { status: 413 });
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 64 * 1024) {
      return NextResponse.json({ error: "WEBHOOK_TOO_LARGE" }, { status: 413 });
    }
    const event = webhookSchema.parse(JSON.parse(rawBody));
    if (event.data.id !== dataId || (queryType && event.type !== queryType)) {
      return NextResponse.json({ error: "WEBHOOK_RESOURCE_MISMATCH" }, { status: 400 });
    }
    if (!isMercadoPagoBillingTopic(event.type)) {
      return NextResponse.json({ received: true, ignored: true });
    }
    const testCredential = config.mercadoPagoAccessToken.startsWith("TEST-");
    if (event.live_mode === testCredential) {
      return NextResponse.json({ error: "WEBHOOK_ENVIRONMENT_MISMATCH" }, { status: 400 });
    }

    const service = createBillingServiceClient(config);
    const persistence = new SupabaseBillingPersistence();
    const signedNotificationId = createHash("sha256")
      .update(`${requestId}\0${dataId}`)
      .digest("hex");
    const claim = await persistence.claimProviderEvent(service, {
      providerEventId: `mp:${signedNotificationId}`,
      eventType: event.type,
      resourceId: dataId,
      occurredAt: event.date_created,
      payload: {
        provider_event_id: event.id,
        request_id: requestId,
        action: event.action,
        api_version: event.api_version ?? null,
        live_mode: event.live_mode,
      },
    });
    if (!claim.claimed) {
      if (claim.processingStatus === "processing" || claim.processingStatus === "failed") {
        return NextResponse.json(
          { error: "WEBHOOK_PROCESSING_IN_PROGRESS" },
          { status: 503, headers: { "Retry-After": "10" } },
        );
      }
      return NextResponse.json({ received: true, duplicate: true });
    }

    try {
      const provider = new MercadoPagoClient(config.mercadoPagoAccessToken);
      const snapshot = await loadProviderBillingSnapshot(provider, event.type, dataId);
      await persistence.reconcileBillingEvent(service, claim.eventId, snapshot);
      return NextResponse.json({ received: true });
    } catch (error) {
      try {
        await persistence.failProviderEvent(service, {
          eventId: claim.eventId,
          errorCode: "WEBHOOK_PROCESSING_FAILED",
        });
      } catch {
        // The lease still guarantees recovery if recording the failure also fails.
      }
      throw error;
    }
  } catch (error) {
    return billingErrorResponse(error);
  }
}
