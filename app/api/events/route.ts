import { NextRequest, NextResponse } from "next/server";
import { productEventSchema } from "@/src/lib/supportSchemas";
import { sanitizeProductMetadata } from "@/src/domain/productAnalytics";
import { authenticateRequest, authErrorResponse } from "@/src/lib/serverAuth";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const parsed = productEventSchema.parse(await request.json());
    if (!auth.e2e && auth.client) { const { error } = await auth.client.rpc("record_user_event", { next_event_name: parsed.eventName, next_feature: parsed.feature, next_session_id: parsed.sessionId, next_dedupe_key: parsed.dedupeKey, next_metadata: sanitizeProductMetadata(parsed.metadata) }); if (error) throw error; }
    return NextResponse.json({ ok: true });
  } catch (error) { return authErrorResponse(error); }
}
