import { afterEach, describe, expect, it, vi } from "vitest";
import { revokeGoogleGrant } from "@/src/server/calendar/oauthCompletion";

describe("Google Calendar grant revocation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("confirms successful and already-invalid grants", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(revokeGoogleGrant("new-grant")).resolves.toBe(true);
    await expect(revokeGoogleGrant("already-invalid")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps transient failures eligible for a durable retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(revokeGoogleGrant("retry-grant")).resolves.toBe(false);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(revokeGoogleGrant("offline-grant")).resolves.toBe(false);
  });
});
