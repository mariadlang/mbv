import { describe, expect, it, vi } from "vitest";
import {
  parseParticipationQueue,
  sendParticipationEntry,
  type ParticipationTransportDependencies,
  type QueuedParticipation,
} from "@/src/services/participationService";

const entry: QueuedParticipation = {
  userId: "user-a",
  actionType: "daily_action_completed",
};

function dependencies(
  overrides: Partial<ParticipationTransportDependencies> = {},
): ParticipationTransportDependencies {
  return {
    getCurrentUserId: vi.fn().mockResolvedValue("user-a"),
    getAccessToken: vi.fn().mockResolvedValue("token-a"),
    request: vi.fn().mockResolvedValue(new Response(JSON.stringify({ counted: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })),
    onCounted: vi.fn(),
    ...overrides,
  };
}

describe("participationService account isolation", () => {
  it("drops legacy ownerless and malformed queue entries", () => {
    expect(parseParticipationQueue(JSON.stringify([
      "daily_action_completed",
      { userId: "", actionType: "daily_action_completed" },
      { userId: "user-a", actionType: "not-qualifying" },
      entry,
    ]))).toEqual([entry]);
  });

  it("never sends an entry owned by another active account", async () => {
    const request = vi.fn();
    const deps = dependencies({
      getCurrentUserId: vi.fn().mockResolvedValue("user-b"),
      request,
    });

    await expect(sendParticipationEntry(entry, deps)).rejects.toThrow("PARTICIPATION_ACCOUNT_MISMATCH");
    expect(deps.getAccessToken).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("revalidates ownership after obtaining the token to stop an account-switch race", async () => {
    const request = vi.fn();
    const deps = dependencies({
      getCurrentUserId: vi.fn()
        .mockResolvedValueOnce("user-a")
        .mockResolvedValueOnce("user-b"),
      request,
    });

    await expect(sendParticipationEntry(entry, deps)).rejects.toThrow("PARTICIPATION_ACCOUNT_MISMATCH");
    expect(deps.getAccessToken).toHaveBeenCalledOnce();
    expect(request).not.toHaveBeenCalled();
  });

  it("sends and refreshes access only while the original account remains active", async () => {
    const deps = dependencies();

    await sendParticipationEntry(entry, deps);

    expect(deps.request).toHaveBeenCalledWith("/api/commerce/activity", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer token-a" }),
      body: JSON.stringify({ actionType: "daily_action_completed" }),
    }));
    expect(deps.onCounted).toHaveBeenCalledOnce();
  });
});
