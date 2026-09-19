import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { qualifyingActivityTypes } from "@/src/domain/participation";
import { authenticateRequest, authErrorResponse } from "@/src/lib/serverAuth";

const activitySchema = z.object({
  actionType: z.enum(qualifyingActivityTypes),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const parsed = activitySchema.parse(await request.json());
    if (auth.e2e || !auth.client) {
      return NextResponse.json({ ok: true, counted: true, streakDays: 1, eligibilityStatus: "not_eligible" });
    }
    const { data, error } = await auth.client.rpc("record_commercial_activity", {
      next_action_type: parsed.actionType,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      ok: true,
      counted: Boolean(row?.counted),
      streakDays: Number(row?.streak_days ?? 0),
      eligibilityStatus: row?.eligibility_status ?? "not_eligible",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
