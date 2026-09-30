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
import {
  LaunchConfirmationEmailPersistence,
  SupabaseLaunchAccessRepository,
} from "@/src/server/launch/repository";
import { LaunchAccessError, launchAccessRequestSchema } from "@/src/server/launch/schema";
import { requestLaunchAccess } from "@/src/server/launch/service";
import {
  getResendEmailRuntimeConfig,
  ResendEmailTransport,
} from "@/src/server/email/resendTransport";

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
    const parsed = launchAccessRequestSchema.safeParse(await readLaunchJsonBody(request, config.appBaseUrl));
    if (!parsed.success) throw new LaunchAccessError("INVALID_EMAIL");
    const emailConfig = getResendEmailRuntimeConfig();
    if (!emailConfig || emailConfig.appBaseUrl !== config.appBaseUrl) {
      throw new LaunchAccessError("NOT_CONFIGURED");
    }
    const client = createLaunchAccessServiceClient(config);
    const result = await requestLaunchAccess({
      email: parsed.data.email,
      clientIdentity: clientIdentity(request),
      locale: parsed.data.locale,
    }, {
      client,
      config,
      createEmailPersistence: (outboxId) => new LaunchConfirmationEmailPersistence(outboxId),
      repository: new SupabaseLaunchAccessRepository(client),
      supportEmail: emailConfig.supportEmail,
      transport: new ResendEmailTransport(emailConfig),
    });
    return launchJson(result, 202);
  } catch (error) {
    return launchErrorResponse(error);
  }
}
