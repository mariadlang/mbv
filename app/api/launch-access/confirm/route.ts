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
import { LaunchAccessError, launchAccessConfirmSchema } from "@/src/server/launch/schema";
import { confirmLaunchAccess } from "@/src/server/launch/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const config = getLaunchAccessRuntimeConfig();
    if (!config) throw new LaunchAccessError("NOT_CONFIGURED");
    const parsed = launchAccessConfirmSchema.safeParse(await readLaunchJsonBody(request, config.appBaseUrl));
    if (!parsed.success) throw new LaunchAccessError("INVALID_TOKEN");
    const client = createLaunchAccessServiceClient(config);
    const result = await confirmLaunchAccess(parsed.data.token, {
      config,
      repository: new SupabaseLaunchAccessRepository(client),
    });
    return launchJson(result, result.status === "expired" ? 410 : 200);
  } catch (error) {
    return launchErrorResponse(error);
  }
}
