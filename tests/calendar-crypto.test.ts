import { describe, expect, it } from "vitest";
import { decryptServerSecret, encryptServerSecret, safeReturnPath } from "@/src/server/calendar/crypto";

describe("calendar server secret encryption", () => {
  it("round-trips a secret without exposing plaintext", async () => {
    const encrypted = await encryptServerSecret("refresh-token-sensitive", "calendar-encryption-key");

    expect(encrypted).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
    expect(encrypted).not.toContain("refresh-token-sensitive");
    await expect(decryptServerSecret(encrypted, "calendar-encryption-key")).resolves.toBe("refresh-token-sensitive");
  });

  it("uses a fresh IV and rejects a different key", async () => {
    const first = await encryptServerSecret("same-token", "correct-key");
    const second = await encryptServerSecret("same-token", "correct-key");

    expect(first).not.toBe(second);
    await expect(decryptServerSecret(first, "wrong-key")).rejects.toBeDefined();
  });

  it("rejects unsupported or truncated ciphertext payloads", async () => {
    await expect(decryptServerSecret("v2.not-supported", "key")).rejects.toThrow("UNSUPPORTED_SECRET_VERSION");
    await expect(decryptServerSecret("v1.AQ", "key")).rejects.toThrow("INVALID_SECRET_PAYLOAD");
  });
});

describe("calendar OAuth return paths", () => {
  it("allows only local paths and caps their length", () => {
    expect(safeReturnPath("/app/settings#integrations")).toBe("/app/settings#integrations");
    expect(safeReturnPath("https://malicious.example/path")).toBe("/app/settings");
    expect(safeReturnPath("//malicious.example/path")).toBe("/app/settings");
    expect(safeReturnPath("/app/settings\\malicious")).toBe("/app/settings");
    expect(safeReturnPath("/app/settings\nmalicious")).toBe("/app/settings");
    expect(safeReturnPath(`/app/settings?next=${"a".repeat(600)}`)).toBe("/app/settings");
  });
});
