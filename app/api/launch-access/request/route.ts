import type { NextRequest } from "next/server";
import {
  createLaunchAccessServiceClient,
  getLaunchAccessRuntimeConfig,
} from "@/src/server/launch/config";
import {
  launchErrorResponse,
  launchJson,
  readLaunchJsonBody,
} from "@/src/server/launch/http";
import { SupabaseLaunchAccessRepository } from "@/src/server/launch/repository";
import {
  LaunchAccessError,
  launchAccessEmailSchema,
  launchAccessRequestSchema,
} from "@/src/server/launch/schema";
import { requestLaunchAccess } from "@/src/server/launch/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIdentity(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  const agent = request.headers.get("user-agent")?.trim() || "unknown";
  return `${address.slice(0, 128)}|${agent.slice(0, 384)}`;
}

export async function POST(request: NextRequest) {
  try {
    const config = getLaunchAccessRuntimeConfig();
    if (!config) throw new LaunchAccessError("NOT_CONFIGURED");
    const body = await readLaunchJsonBody(request, config.appBaseUrl);
    const parsed = launchAccessRequestSchema.safeParse(body);
    if (!parsed.success) {
      const candidateEmail = body && typeof body === "object" && "email" in body
        ? body.email
        : undefined;
      if (!launchAccessEmailSchema.safeParse(candidateEmail).success) {
        throw new LaunchAccessError("INVALID_EMAIL");
      }
      throw new LaunchAccessError("INVALID_REQUEST");
    }
    const client = createLaunchAccessServiceClient(config);
    const result = await requestLaunchAccess({
      email: parsed.data.email,
      clientIdentity: clientIdentity(request),
      locale: parsed.data.locale,
      newsletterOptIn: parsed.data.newsletterOptIn,
      origin: parsed.data.origin,
      requestType: parsed.data.requestType,
    }, {
      config,
      repository: new SupabaseLaunchAccessRepository(client),
    });
    return launchJson(result, 202);
  } catch (error) {
    return launchErrorResponse(error);
  }
}
