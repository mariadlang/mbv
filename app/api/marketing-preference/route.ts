import { NextRequest, NextResponse } from "next/server";
import { marketingPreferenceSchema } from "@/src/lib/supportSchemas";
import { authenticateRequest, authErrorResponse } from "@/src/lib/serverAuth";

export async function GET(request: NextRequest) {
  try { const auth = await authenticateRequest(request); if (auth.e2e || !auth.client) return NextResponse.json({ consent: false }); const { data, error } = await auth.client.from("marketing_preferences").select("email_marketing_consent").eq("user_id", auth.userId).maybeSingle(); if (error) throw error; return NextResponse.json({ consent: Boolean(data?.email_marketing_consent) }); } catch (error) { return authErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try { const auth = await authenticateRequest(request); const parsed = marketingPreferenceSchema.parse(await request.json()); if (auth.e2e || !auth.client) return NextResponse.json({ consent: parsed.consent }); const { data, error } = await auth.client.rpc("set_marketing_preference", { next_consent: parsed.consent, next_source: parsed.source }); if (error) throw error; return NextResponse.json({ consent: Boolean(data?.email_marketing_consent) }); } catch (error) { return authErrorResponse(error); }
}
