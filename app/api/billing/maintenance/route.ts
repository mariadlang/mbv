import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createBillingServiceClient,
  requireBillingDatabaseConfig,
} from "@/src/server/billing/config";
import { billingErrorResponse } from "@/src/server/billing/http";
import { SupabaseBillingPersistence } from "@/src/server/billing/repository";
import { processTransactionalEmailBatch } from "@/src/server/email/outbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function secretsEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
  if (cronSecret.length < 32) {
    return NextResponse.json({ error: "BILLING_MAINTENANCE_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!secretsEqual(request.headers.get("authorization") ?? "", `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const service = createBillingServiceClient(requireBillingDatabaseConfig());
    const persistence = new SupabaseBillingPersistence();
    const configuredAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ?? "";
    let adminNotificationEmail: "updated" | "cleared" | "invalid_cleared";
    if (configuredAdminEmail) {
      const parsed = z.string().email().safeParse(configuredAdminEmail);
      if (parsed.success) {
        await persistence.setAdminNotificationEmail(service, parsed.data.toLowerCase());
        adminNotificationEmail = "updated";
      } else {
        await persistence.setAdminNotificationEmail(service, "");
        adminNotificationEmail = "invalid_cleared";
      }
    } else {
      await persistence.setAdminNotificationEmail(service, "");
      adminNotificationEmail = "cleared";
    }
    await persistence.runCommercialMaintenance(service, new Date().toISOString());

    // There is deliberately no live provider in this repository. This call
    // proves that maintenance does not claim outbox rows until one is wired
    // explicitly; generated messages therefore remain retryable and visible.
    const emailDelivery = await processTransactionalEmailBatch({
      client: service,
      transport: null,
      maxMessages: 25,
    });
    return NextResponse.json({ ok: true, adminNotificationEmail, emailDelivery }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
