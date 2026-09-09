import { NextRequest, NextResponse } from "next/server";
import { productEventSchema } from "@/src/lib/supportSchemas";
import { sanitizeProductMetadata } from "@/src/domain/productAnalytics";
import { authenticateRequest, authErrorResponse } from "@/src/lib/serverAuth";

function productEventRpcError(error: { message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("event rate limit exceeded")) {
    return NextResponse.json({ error: "EVENT_RATE_LIMITED" }, { status: 429 });
  }
  if ([
    "unsupported event",
    "invalid session id",
    "invalid dedupe key",
    "invalid metadata",
    "invalid occurred_at",
  ].some((expected) => message.includes(expected))) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }
  return error;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const parsed = productEventSchema.parse(await request.json());
    if (!auth.e2e && auth.client) {
      const { error } = await auth.client.rpc("record_user_event", { next_event_name: parsed.eventName, next_feature: parsed.feature, next_session_id: parsed.sessionId, next_dedupe_key: parsed.dedupeKey, next_metadata: sanitizeProductMetadata(parsed.metadata), next_occurred_at: parsed.occurredAt });
      if (error) throw productEventRpcError(error);
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return authErrorResponse(error); }
}
