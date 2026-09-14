const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const GOOGLE_CALENDAR_OAUTH_COOKIE = "mbv_google_calendar_oauth";
export const GOOGLE_CALENDAR_COMPLETION_COOKIE = "mbv_google_calendar_completion";

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function randomOpaqueValue(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesToBase64Url(value);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function constantTimeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  return difference === 0;
}

async function importEncryptionKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptServerSecret(value: string, secret: string) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await importEncryptionKey(secret), encoder.encode(value));
  const payload = new Uint8Array(iv.length + encrypted.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(encrypted), iv.length);
  return `v1.${bytesToBase64Url(payload)}`;
}

export async function decryptServerSecret(value: string, secret: string) {
  const [version, encoded] = value.split(".", 2);
  if (version !== "v1" || !encoded) throw new Error("UNSUPPORTED_SECRET_VERSION");
  const payload = base64UrlToBytes(encoded);
  if (payload.length <= 12) throw new Error("INVALID_SECRET_PAYLOAD");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: payload.slice(0, 12) },
    await importEncryptionKey(secret),
    payload.slice(12),
  );
  return decoder.decode(decrypted);
}

export function safeReturnPath(value: string | null | undefined) {
  const fallback = "/app/settings";
  const containsUnsafeCharacter = value
    ? Array.from(value).some((character) => character === "\\" || character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f)
    : false;
  if (!value || value.length > 500 || containsUnsafeCharacter) return fallback;
  try {
    const parsed = new URL(value, "https://my-best-version.invalid");
    if (parsed.origin !== "https://my-best-version.invalid" || !/^\/app(?:\/|$)/.test(parsed.pathname)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
