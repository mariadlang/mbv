import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarServerConfig } from "@/src/server/calendar/config";
import { decryptServerSecret, encryptServerSecret } from "@/src/server/calendar/crypto";

const pendingCalendarSchema = z.object({
  id: z.string().trim().min(1).max(1024),
  summary: z.string().max(4096),
  primary: z.boolean().optional(),
  accessRole: z.enum(["freeBusyReader", "reader", "writerWithoutPrivateAccess", "writer", "owner"]).optional(),
  timeZone: z.string().max(255).optional(),
  backgroundColor: z.string().max(64).optional(),
});

export const googleOAuthPendingPayloadSchema = z.object({
  version: z.literal(1),
  accountId: z.string().trim().min(1).max(512),
  email: z.string().trim().email().max(320),
  accessToken: z.string().min(1).max(16_384),
  refreshToken: z.string().min(1).max(16_384),
  tokenExpiresAt: z.string().datetime(),
  scopes: z.array(z.string().trim().min(1).max(500)).max(50),
  calendars: z.array(pendingCalendarSchema).max(1_000),
  capturedAt: z.string().datetime(),
});

export type GoogleOAuthPendingPayload = z.infer<typeof googleOAuthPendingPayloadSchema>;

export async function revokeGoogleGrant(token: string): Promise<boolean> {
  if (!token) return true;
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);
  return Boolean(response && (response.ok || response.status === 400 || response.status === 404));
}

export async function queueGoogleGrantRevocation(
  service: SupabaseClient,
  config: CalendarServerConfig,
  token: string,
  sourceKey: string,
  userId?: string,
) {
  if (!token) return;
  const { error } = await service.from("google_calendar_token_revocations").upsert({
    user_id: userId ?? null,
    source_key: sourceKey,
    token_ciphertext: await encryptServerSecret(token, config.encryptionKey),
    next_attempt_at: new Date().toISOString(),
    last_error_code: null,
  }, { onConflict: "source_key", ignoreDuplicates: true });
  if (error) throw error;
}

export async function cleanupGoogleOAuthStates(
  service: SupabaseClient,
  options: { userId?: string; expiredBefore?: string } = {},
) {
  const { error } = await service.rpc("cleanup_google_calendar_oauth_states", {
    p_user_id: options.userId ?? null,
    p_expired_before: options.expiredBefore ?? null,
  });
  if (error) throw error;
}

export async function drainGoogleGrantRevocations(service: SupabaseClient, config: CalendarServerConfig) {
  const now = new Date().toISOString();
  const { data, error } = await service.from("google_calendar_token_revocations")
    .select("id,token_ciphertext,attempt_count")
    .lte("next_attempt_at", now)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  for (const row of data ?? []) {
    let completed = false;
    try {
      completed = await revokeGoogleGrant(await decryptServerSecret(row.token_ciphertext, config.encryptionKey));
    } catch {
      completed = false;
    }
    if (completed) {
      await service.from("google_calendar_token_revocations").delete().eq("id", row.id);
      continue;
    }
    const attempts = Number(row.attempt_count ?? 0) + 1;
    const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
    await service.from("google_calendar_token_revocations").update({
      attempt_count: attempts,
      next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
      last_error_code: "GOOGLE_REVOCATION_RETRY",
    }).eq("id", row.id);
  }
}
