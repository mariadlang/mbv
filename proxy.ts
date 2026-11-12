import { NextResponse, type NextRequest } from "next/server";
import { betaBlockedPath, betaEnabled } from "@/src/server/beta/policy";

export function proxy(request: NextRequest) {
  if (!betaEnabled()) return NextResponse.next();
  // Defense in depth: applies even to unauthenticated billing webhooks/cron.
  const response = betaBlockedPath(request.nextUrl.pathname)
    ? NextResponse.json({ error: "BETA_OPERATION_DISABLED" }, { status: 403 })
    : NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
