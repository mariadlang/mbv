import { createHmac } from "node:crypto";

export function launchFingerprint(
  secret: string,
  scope: "client" | "request" | "payload",
  value: string,
): string {
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}
