import { type NextRequest, NextResponse } from "next/server";
import { LaunchAccessError } from "@/src/server/launch/schema";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;

export function launchJson(body: unknown, status: number, headers?: HeadersInit): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...headers },
  });
}

const MAX_PUBLIC_JSON_BYTES = 4_096;

export async function readLaunchJsonBody(request: NextRequest, appBaseUrl: string): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") throw new LaunchAccessError("INVALID_REQUEST");
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) throw new LaunchAccessError("INVALID_REQUEST");
    if (length > MAX_PUBLIC_JSON_BYTES) throw new LaunchAccessError("REQUEST_TOO_LARGE");
  }
  const expectedOrigin = new URL(appBaseUrl).origin;
  if (request.headers.get("origin") !== expectedOrigin) {
    throw new LaunchAccessError("REQUEST_FORBIDDEN");
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_PUBLIC_JSON_BYTES) {
    throw new LaunchAccessError("REQUEST_TOO_LARGE");
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new LaunchAccessError("INVALID_REQUEST");
  }
}

export function launchErrorResponse(error: unknown): NextResponse {
  if (error instanceof LaunchAccessError) {
    switch (error.code) {
      case "INVALID_EMAIL":
      case "INVALID_REQUEST":
      case "INVALID_TOKEN":
        return launchJson({ error: error.code }, 400);
      case "CAMPAIGN_CLOSED":
        return launchJson({ error: error.code }, 409);
      case "RATE_LIMITED":
        return launchJson({ error: error.code }, 429, { "Retry-After": "3600" });
      case "REQUEST_FORBIDDEN":
        return launchJson({ error: error.code }, 403);
      case "REQUEST_TOO_LARGE":
        return launchJson({ error: error.code }, 413);
      case "NOT_CONFIGURED":
      case "REQUEST_UNAVAILABLE":
        return launchJson({ error: error.code }, 503);
    }
  }
  return launchJson({ error: "REQUEST_FAILED" }, 500);
}
