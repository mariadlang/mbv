import { createOpaqueReferralCode, REFERRAL_CODE_PATTERN } from "@/src/domain/shareCards";

const ATTRIBUTION_KEY = "mbv-referral-attribution-v1";
const OWN_CODE_PREFIX = "mbv-referral-code-v1:";
const ATTRIBUTION_TTL_MS = 29 * 86_400_000;

export interface PendingReferralAttribution {
  code: string;
  capturedAt: string;
}

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function readJson(storage: Storage, key: string): unknown {
  try {
    return JSON.parse(storage.getItem(key) ?? "null") as unknown;
  } catch {
    return null;
  }
}

function isFreshAttribution(value: unknown, now: Date): value is PendingReferralAttribution {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingReferralAttribution>;
  if (!REFERRAL_CODE_PATTERN.test(candidate.code ?? "")) return false;
  const capturedAt = new Date(candidate.capturedAt ?? "").getTime();
  return Number.isFinite(capturedAt)
    && capturedAt <= now.getTime() + 5 * 60_000
    && now.getTime() - capturedAt <= ATTRIBUTION_TTL_MS;
}

/**
 * First-touch, browser-local referral capture. The opaque code contains no
 * identity and is only sent through consented product analytics after login.
 */
export function captureReferralAttribution(
  search: string,
  now = new Date(),
  storage: Storage | null = browserStorage(),
): PendingReferralAttribution | null {
  if (!storage) return null;
  const existing = readPendingReferralAttribution(now, storage);
  if (existing) return existing;
  const code = new URLSearchParams(search.startsWith("?") ? search : `?${search}`).get("ref") ?? "";
  if (!REFERRAL_CODE_PATTERN.test(code)) return null;
  const attribution = { code, capturedAt: now.toISOString() } satisfies PendingReferralAttribution;
  try { storage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch { return null; }
  return attribution;
}

export function readPendingReferralAttribution(
  now = new Date(),
  storage: Storage | null = browserStorage(),
): PendingReferralAttribution | null {
  if (!storage) return null;
  const value = readJson(storage, ATTRIBUTION_KEY);
  if (isFreshAttribution(value, now)) return value;
  try { storage.removeItem(ATTRIBUTION_KEY); } catch { /* No afecta el acceso. */ }
  return null;
}

export function clearPendingReferralAttribution(storage: Storage | null = browserStorage()) {
  if (!storage) return;
  try { storage.removeItem(ATTRIBUTION_KEY); } catch { /* No afecta el acceso. */ }
}

export function getOrCreateAccountReferralCode(
  accountId: string,
  storage: Storage | null = browserStorage(),
  createCode: () => string = createOpaqueReferralCode,
) {
  if (!accountId || !storage) return createCode();
  const key = `${OWN_CODE_PREFIX}${encodeURIComponent(accountId)}`;
  try {
    const existing = storage.getItem(key) ?? "";
    if (REFERRAL_CODE_PATTERN.test(existing)) return existing;
    const code = createCode();
    if (!REFERRAL_CODE_PATTERN.test(code)) throw new Error("INVALID_REFERRAL_CODE");
    storage.setItem(key, code);
    return code;
  } catch {
    return createCode();
  }
}
