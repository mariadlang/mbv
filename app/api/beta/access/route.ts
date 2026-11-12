import type { NextRequest } from "next/server";
import { authenticateRequest, authErrorResponse } from "@/src/lib/serverAuth";
import { betaEnabled } from "@/src/server/beta/policy";

export async function GET(request: NextRequest) {
  if (!betaEnabled()) return new Response(null, { status: 404 });
  try {
    const context = await authenticateRequest(request);
    return Response.json({ access: context.betaAccess }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authErrorResponse(error); }
}
