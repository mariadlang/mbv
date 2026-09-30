import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const tokenPayloadSchema = z.object({
  v: z.literal(1),
  campaignKey: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/),
  registrationId: z.string().uuid(),
  tokenVersion: z.number().int().positive(),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expiresAt: z.number().int().positive(),
}).strict();

export type LaunchConfirmationTokenPayload = z.infer<typeof tokenPayloadSchema>;

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signLaunchConfirmationToken(
  payload: LaunchConfirmationTokenPayload,
  secret: string,
): string {
  const encoded = Buffer.from(JSON.stringify(tokenPayloadSchema.parse(payload)), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export type LaunchTokenVerification =
  | { status: "valid"; payload: LaunchConfirmationTokenPayload }
  | { status: "expired" }
  | { status: "invalid" };

export function verifyLaunchConfirmationToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): LaunchTokenVerification {
  if (token.length > 2_048) return { status: "invalid" };
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return { status: "invalid" };
  }
  const expectedSignature = signature(encoded, secret);
  const suppliedBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (
    suppliedBytes.length !== expectedBytes.length
    || !timingSafeEqual(suppliedBytes, expectedBytes)
  ) return { status: "invalid" };
  try {
    const payload = tokenPayloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
    if (payload.expiresAt <= now.getTime()) return { status: "expired" };
    return { status: "valid", payload };
  } catch {
    return { status: "invalid" };
  }
}

export function launchFingerprint(secret: string, scope: "client" | "email", value: string): string {
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}
