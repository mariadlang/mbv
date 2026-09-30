import {
  createLaunchAccessServiceClient,
  getLaunchAccessRuntimeConfig,
} from "@/src/server/launch/config";
import { getResendEmailRuntimeConfig } from "@/src/server/email/resendTransport";
import { launchJson } from "@/src/server/launch/http";
import { SupabaseLaunchAccessRepository } from "@/src/server/launch/repository";
import { getPublicLaunchAccessState } from "@/src/server/launch/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = getLaunchAccessRuntimeConfig();
  if (!config) return launchJson({ status: "unavailable" }, 200);
  const emailConfig = getResendEmailRuntimeConfig();
  if (!emailConfig || emailConfig.appBaseUrl !== config.appBaseUrl) {
    return launchJson({ status: "unavailable" }, 200);
  }
  try {
    const client = createLaunchAccessServiceClient(config);
    return launchJson(await getPublicLaunchAccessState({
      config,
      repository: new SupabaseLaunchAccessRepository(client),
    }), 200);
  } catch {
    return launchJson({ status: "unavailable" }, 200);
  }
}
