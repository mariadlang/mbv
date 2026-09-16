import { describe, expect, it } from "vitest";
import {
  captureReferralAttribution,
  clearPendingReferralAttribution,
  getOrCreateAccountReferralCode,
  readPendingReferralAttribution,
} from "./referralAttributionService";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const codeA = `ref_${"ab".repeat(18)}`;
const codeB = `ref_${"cd".repeat(18)}`;

describe("referral attribution", () => {
  it("captures only an opaque referral code and keeps first touch for 29 days", () => {
    const storage = new MemoryStorage();
    const first = captureReferralAttribution(`?ref=${codeA}&email=private@example.com`, new Date("2026-09-01T00:00:00Z"), storage);
    const second = captureReferralAttribution(`?ref=${codeB}`, new Date("2026-09-02T00:00:00Z"), storage);

    expect(first).toEqual({ code: codeA, capturedAt: "2026-09-01T00:00:00.000Z" });
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).not.toContain("private@example.com");
  });

  it("rejects invalid or expired attribution and can clear it after consented queueing", () => {
    const storage = new MemoryStorage();
    expect(captureReferralAttribution("?ref=maria@example.com", new Date("2026-09-01T00:00:00Z"), storage)).toBeNull();
    captureReferralAttribution(`?ref=${codeA}`, new Date("2026-09-01T00:00:00Z"), storage);
    expect(readPendingReferralAttribution(new Date("2026-10-01T00:00:00Z"), storage)).toBeNull();
    captureReferralAttribution(`?ref=${codeA}`, new Date("2026-10-01T00:00:00Z"), storage);
    clearPendingReferralAttribution(storage);
    expect(readPendingReferralAttribution(new Date("2026-10-01T00:00:01Z"), storage)).toBeNull();
  });

  it("reuses one cryptographic referral code per local account without embedding identity", () => {
    const storage = new MemoryStorage();
    let generated = 0;
    const create = () => { generated += 1; return codeA; };
    expect(getOrCreateAccountReferralCode("account@example.com", storage, create)).toBe(codeA);
    expect(getOrCreateAccountReferralCode("account@example.com", storage, () => codeB)).toBe(codeA);
    expect(generated).toBe(1);
    expect(codeA).not.toContain("account");
  });
});
