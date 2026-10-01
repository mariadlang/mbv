export type LaunchAccessRequestResult =
  | { status: "request_received" }
  | { status: "newsletter_subscribed" }
  | { status: "closed" }
  | { status: "unavailable" }
  | { status: "error" };

export type LaunchAccessPublicState = "open" | "closed" | "unavailable";
export type LaunchAccessLocale = "es" | "en";
export type LaunchAccessRequestType = "waitlist" | "newsletter_only";

export interface LaunchAccessRequestOptions {
  requestId?: string;
  newsletterOptIn?: boolean;
  origin?: "landing_launch";
  requestType?: LaunchAccessRequestType;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function requestLaunchAccess(
  email: string,
  locale: LaunchAccessLocale,
  options: LaunchAccessRequestOptions = {},
): Promise<LaunchAccessRequestResult> {
  const requestType = options.requestType ?? "waitlist";
  try {
    const response = await fetch("/api/launch-access/request", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        requestId: options.requestId ?? crypto.randomUUID(),
        locale,
        requestType,
        newsletterOptIn: options.newsletterOptIn ?? false,
        origin: options.origin ?? "landing_launch",
      }),
    });
    const payload = await readJson(response);

    if (response.status === 202 && payload.status === "request_received") {
      return { status: "request_received" };
    }
    if (response.status === 202 && payload.status === "newsletter_subscribed") {
      return { status: "newsletter_subscribed" };
    }
    if (response.status === 409 && payload.error === "CAMPAIGN_CLOSED") {
      return { status: "closed" };
    }
    if (
      response.status === 503
      && (payload.error === "REQUEST_UNAVAILABLE" || payload.error === "NOT_CONFIGURED")
    ) {
      return { status: "unavailable" };
    }
    return { status: "error" };
  } catch {
    return { status: "error" };
  }
}

export async function getLaunchAccessPublicState(): Promise<LaunchAccessPublicState | null> {
  try {
    const response = await fetch("/api/launch-access/public-state", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await readJson(response);
    return payload.status === "open" || payload.status === "closed" || payload.status === "unavailable"
      ? payload.status
      : null;
  } catch {
    return null;
  }
}
