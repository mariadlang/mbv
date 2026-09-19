const encoder = new TextEncoder();

export interface MercadoPagoSignatureInput {
  dataId: string;
  requestId: string;
  signature: string;
  secret: string;
  now?: Date;
}

export const MERCADO_PAGO_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1_000;

interface ParsedSignature {
  timestamp: string;
  hashes: string[];
}

function parseSignature(value: string): ParsedSignature | null {
  let timestamp = "";
  const hashes: string[] = [];
  for (const segment of value.split(",")) {
    const separator = segment.indexOf("=");
    if (separator < 1) return null;
    const key = segment.slice(0, separator).trim().toLowerCase();
    const entry = segment.slice(separator + 1).trim();
    if (key === "ts") {
      if (timestamp || !/^\d{8,16}$/.test(entry)) return null;
      timestamp = entry;
    } else if (key === "v1") {
      if (!/^[a-f0-9]{64}$/i.test(entry)) return null;
      hashes.push(entry.toLowerCase());
    }
  }
  return timestamp && hashes.length ? { timestamp, hashes } : null;
}

export function mercadoPagoSignatureManifest(dataId: string, requestId: string, timestamp: string): string {
  return `id:${dataId};request-id:${requestId};ts:${timestamp};`;
}

function bytesToHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqualHex(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left.toLowerCase());
  const rightBytes = encoder.encode(right.toLowerCase());
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function signMercadoPagoManifest(manifest: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(manifest)));
}

export async function verifyMercadoPagoWebhookSignature(input: MercadoPagoSignatureInput): Promise<boolean> {
  const parsed = parseSignature(input.signature);
  if (
    !parsed
    || !input.dataId
    || input.dataId.length > 200
    || !input.requestId
    || input.requestId.length > 200
    || input.secret.length < 32
  ) return false;
  const timestampValue = Number(parsed.timestamp);
  if (!Number.isSafeInteger(timestampValue) || timestampValue <= 0) return false;
  const timestampMs = timestampValue < 1_000_000_000_000 ? timestampValue * 1_000 : timestampValue;
  const nowMs = (input.now ?? new Date()).getTime();
  if (!Number.isFinite(nowMs) || Math.abs(nowMs - timestampMs) > MERCADO_PAGO_SIGNATURE_MAX_AGE_MS) return false;
  const expected = await signMercadoPagoManifest(
    mercadoPagoSignatureManifest(input.dataId, input.requestId, parsed.timestamp),
    input.secret,
  );
  return parsed.hashes.some((hash) => constantTimeEqualHex(hash, expected));
}
