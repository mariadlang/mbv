import { describe, expect, it } from "vitest";
import { dismissReturnExperience, readReturnExperience, registerReturnActivity, touchReturnActivity } from "./returnExperienceService";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("returnExperienceService", () => {
  it("shows a return only after three complete days and keeps it for the current session", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    expect(registerReturnActivity("account-a", new Date("2026-09-01T12:00:00Z"), local, session).visible).toBe(false);
    expect(registerReturnActivity("account-a", new Date("2026-09-03T12:00:00Z"), local, session).visible).toBe(false);

    const returned = registerReturnActivity("account-a", new Date("2026-09-07T12:00:00Z"), local, session);
    expect(returned).toMatchObject({ visible: true, daysAway: 4, detectedAt: "2026-09-07T12:00:00.000Z" });
    expect(readReturnExperience("account-a", session)).toEqual(returned);
    expect(registerReturnActivity("account-a", new Date("2026-09-07T12:05:00Z"), local, session)).toEqual(returned);
  });

  it("dismisses the active return without storing planner content", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    registerReturnActivity("account-a", new Date("2026-09-01T12:00:00Z"), local, session);
    registerReturnActivity("account-a", new Date("2026-09-05T12:00:00Z"), local, session);
    dismissReturnExperience("account-a", new Date("2026-09-05T12:10:00Z"), local, session);

    expect(registerReturnActivity("account-a", new Date("2026-09-05T12:11:00Z"), local, session).visible).toBe(false);
    expect(Array.from({ length: local.length }, (_, index) => local.getItem(local.key(index) ?? "")).join(" ")).toBe(
      '{"lastSeenAt":"2026-09-05T12:11:00.000Z","dismissedAt":"2026-09-05T12:10:00.000Z"}',
    );
  });

  it("isolates return state by account", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    registerReturnActivity("account-a", new Date("2026-09-01T12:00:00Z"), local, session);
    expect(registerReturnActivity("account-a", new Date("2026-09-05T12:00:00Z"), local, session).visible).toBe(true);
    expect(registerReturnActivity("account-b", new Date("2026-09-05T12:00:00Z"), local, session).visible).toBe(false);
  });

  it("tracks activity from any authenticated route without clearing an active return", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    registerReturnActivity("account-a", new Date("2026-09-01T12:00:00Z"), local, session);
    const returned = registerReturnActivity("account-a", new Date("2026-09-05T12:00:00Z"), local, session);

    touchReturnActivity("account-a", new Date("2026-09-05T12:05:00Z"), local);

    expect(readReturnExperience("account-a", session)).toEqual(returned);
  });
});
