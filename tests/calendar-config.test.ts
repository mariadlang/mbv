import { describe, expect, it } from "vitest";
import { isStrongCalendarEncryptionKey } from "@/src/server/calendar/config";

describe("Google Calendar encryption configuration", () => {
  it("requires at least 32 bytes of secret material", () => {
    expect(isStrongCalendarEncryptionKey("short-secret")).toBe(false);
    expect(isStrongCalendarEncryptionKey("x".repeat(31))).toBe(false);
    expect(isStrongCalendarEncryptionKey("x".repeat(32))).toBe(true);
    expect(isStrongCalendarEncryptionKey("YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=")).toBe(true);
  });
});
