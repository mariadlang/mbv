export type LaunchAccessRequestResult =
  | { status: "confirmation_pending" }
  | { status: "closed" }
  | { status: "error" };

export type LaunchAccessConfirmationResult =
  | { status: "email_confirmed" }
  | { status: "expired" }
  | { status: "error" };

export type LaunchAccessPublicState = "open" | "closed" | "unavailable";
export type LaunchAccessLocale = "es" | "en";

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
): Promise<LaunchAccessRequestResult> {
  try {
    const response = await fetch("/api/launch-access/request", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, locale }),
    });
    const payload = await readJson(response);

    if (response.status === 202 && payload.status === "confirmation_pending") {
      return { status: "confirmation_pending" };
    }
    if (response.status === 409 && payload.error === "CAMPAIGN_CLOSED") {
      return { status: "closed" };
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

export async function confirmLaunchAccess(token: string): Promise<LaunchAccessConfirmationResult> {
  try {
    const response = await fetch("/api/launch-access/confirm", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const payload = await readJson(response);

    if (response.status === 200 && payload.status === "email_confirmed") {
      return { status: "email_confirmed" };
    }
    if (response.status === 410 && payload.status === "expired") {
      return { status: "expired" };
    }
    return { status: "error" };
  } catch {
    return { status: "error" };
  }
}
