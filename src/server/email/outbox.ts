import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  TRANSACTIONAL_EMAIL_KINDS,
  type RenderedTransactionalEmail,
  type TransactionalEmailKind,
} from "@/src/server/email/templates";
import type { TransactionalEmailTransport } from "@/src/server/email/transport";

const emailOutboxRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  recipient_kind: z.enum(["user", "admin"]),
  recipient_email: z.string().email(),
  template_key: z.enum(TRANSACTIONAL_EMAIL_KINDS),
  dedupe_key: z.string().min(1).max(640),
  template_data: z.record(z.string(), z.unknown()),
  attempt_count: z.number().int().positive(),
  created_at: z.string().datetime({ offset: true }),
  claim_token: z.string().uuid(),
  claim_expires_at: z.string().datetime({ offset: true }),
});

export interface ClaimedEmailOutboxRow {
  id: string;
  userId: string | null;
  recipientKind: "user" | "admin";
  recipientEmail: string;
  templateKey: TransactionalEmailKind;
  dedupeKey: string;
  templateData: Record<string, unknown>;
  attemptCount: number;
  createdAt: string;
  claimToken: string;
  claimExpiresAt: string;
}

export interface CompleteEmailDeliveryInput {
  outboxId: string;
  claimToken: string;
  status: "accepted" | "failed";
  providerMessageId: string | null;
  errorCode: string | null;
  nextRetryAt: string | null;
}

export interface EmailOutboxPersistence {
  claimNext(client: SupabaseClient, now: string): Promise<ClaimedEmailOutboxRow | null>;
  isStillRelevant(client: SupabaseClient, row: ClaimedEmailOutboxRow): Promise<boolean>;
  complete(client: SupabaseClient, input: CompleteEmailDeliveryInput): Promise<void>;
}

function toClaimedRow(value: unknown): ClaimedEmailOutboxRow | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;
  const row = emailOutboxRowSchema.parse(candidate);
  return {
    id: row.id,
    userId: row.user_id,
    recipientKind: row.recipient_kind,
    recipientEmail: row.recipient_email,
    templateKey: row.template_key,
    dedupeKey: row.dedupe_key,
    templateData: row.template_data,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
    claimToken: row.claim_token,
    claimExpiresAt: row.claim_expires_at,
  };
}

export class SupabaseEmailOutboxPersistence implements EmailOutboxPersistence {
  async claimNext(client: SupabaseClient, now: string): Promise<ClaimedEmailOutboxRow | null> {
    const { data, error } = await client.rpc("claim_next_email", { p_now: now });
    if (error) throw error;
    return toClaimedRow(data);
  }

  async isStillRelevant(client: SupabaseClient, row: ClaimedEmailOutboxRow): Promise<boolean> {
    const { data, error } = await client.rpc("revalidate_email_delivery", {
      p_outbox_id: row.id,
      p_claim_token: row.claimToken,
    });
    if (error) throw error;
    return data === true;
  }

  async complete(client: SupabaseClient, input: CompleteEmailDeliveryInput): Promise<void> {
    const { error } = await client.rpc("complete_email_delivery", {
      p_outbox_id: input.outboxId,
      p_claim_token: input.claimToken,
      p_status: input.status,
      p_provider_message_id: input.providerMessageId,
      p_error_code: input.errorCode,
      p_next_retry_at: input.nextRetryAt,
    });
    if (error) throw error;
  }
}

export type EmailOutboxProcessResult =
  | { status: "blocked"; reason: "EMAIL_TRANSPORT_NOT_CONFIGURED" | "EMAIL_RENDERER_NOT_CONFIGURED" }
  | { status: "idle" }
  | { status: "superseded"; outboxId: string }
  | { status: "accepted"; outboxId: string; providerMessageId: string }
  | { status: "failed"; outboxId: string; errorCode: string; nextRetryAt: string };

export interface ProcessNextEmailInput {
  client: SupabaseClient;
  transport: TransactionalEmailTransport | null;
  render?: (row: ClaimedEmailOutboxRow) => RenderedTransactionalEmail;
  persistence?: EmailOutboxPersistence;
  now?: Date;
  /** Tests may opt in to the fake transport; production callers must not. */
  allowTestTransport?: boolean;
}

export interface ProcessEmailBatchResult {
  processed: number;
  terminal: EmailOutboxProcessResult;
  results: EmailOutboxProcessResult[];
}

function retryAt(now: Date, attemptCount: number): string {
  const seconds = Math.min(3_600, 30 * (2 ** Math.min(attemptCount - 1, 7)));
  return new Date(now.getTime() + seconds * 1_000).toISOString();
}

function deliveryErrorCode(error: unknown): string {
  if (error instanceof Error && /^[A-Z0-9_]{3,80}$/.test(error.message)) return error.message;
  return "EMAIL_DELIVERY_FAILED";
}

export async function processNextTransactionalEmail(
  input: ProcessNextEmailInput,
): Promise<EmailOutboxProcessResult> {
  const canUseTransport = input.transport?.mode === "live"
    || (input.allowTestTransport === true && input.transport?.mode === "test");
  if (!canUseTransport || !input.transport) {
    return { status: "blocked", reason: "EMAIL_TRANSPORT_NOT_CONFIGURED" };
  }
  if (!input.render) return { status: "blocked", reason: "EMAIL_RENDERER_NOT_CONFIGURED" };

  const persistence = input.persistence ?? new SupabaseEmailOutboxPersistence();
  const now = input.now ?? new Date();
  const row = await persistence.claimNext(input.client, now.toISOString());
  if (!row) return { status: "idle" };
  // Revalidate after claiming and immediately before the external side effect.
  // A payment webhook can supersede a pending-renewal notice while it is queued.
  if (!await persistence.isStillRelevant(input.client, row)) {
    return { status: "superseded", outboxId: row.id };
  }

  let delivery: Awaited<ReturnType<TransactionalEmailTransport["send"]>>;
  try {
    const rendered = input.render(row);
    delivery = await input.transport.send({
      to: row.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      dedupeKey: row.dedupeKey,
      tags: { template: row.templateKey, outbox_id: row.id },
    });
  } catch (error) {
    const errorCode = deliveryErrorCode(error);
    const nextRetryAt = retryAt(now, row.attemptCount);
    await persistence.complete(input.client, {
      outboxId: row.id,
      claimToken: row.claimToken,
      status: "failed",
      providerMessageId: null,
      errorCode,
      nextRetryAt,
    });
    return { status: "failed", outboxId: row.id, errorCode, nextRetryAt };
  }
  if (delivery.status !== "accepted") {
    const errorCode = "EMAIL_TRANSPORT_DISABLED";
    const nextRetryAt = retryAt(now, row.attemptCount);
    await persistence.complete(input.client, {
      outboxId: row.id,
      claimToken: row.claimToken,
      status: "failed",
      providerMessageId: null,
      errorCode,
      nextRetryAt,
    });
    return { status: "failed", outboxId: row.id, errorCode, nextRetryAt };
  }

  // Completion errors intentionally escape. Once a provider accepted the
  // message, only its idempotency key can make a retry safe; marking the row
  // failed here would incorrectly claim that delivery itself failed.
  await persistence.complete(input.client, {
    outboxId: row.id,
    claimToken: row.claimToken,
    status: "accepted",
    providerMessageId: delivery.providerMessageId,
    errorCode: null,
    nextRetryAt: null,
  });
  return { status: "accepted", outboxId: row.id, providerMessageId: delivery.providerMessageId };
}

/** Processes a bounded batch so a scheduled cron cannot become a one-message bottleneck. */
export async function processTransactionalEmailBatch(
  input: ProcessNextEmailInput & { maxMessages?: number },
): Promise<ProcessEmailBatchResult> {
  const maxMessages = input.maxMessages ?? 25;
  if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 100) {
    throw new Error("INVALID_EMAIL_BATCH_SIZE");
  }
  const results: EmailOutboxProcessResult[] = [];
  for (let index = 0; index < maxMessages; index += 1) {
    const result = await processNextTransactionalEmail(input);
    results.push(result);
    if (result.status === "idle" || result.status === "blocked") {
      return { processed: results.filter((item) => item.status === "accepted" || item.status === "failed" || item.status === "superseded").length, terminal: result, results };
    }
  }
  return {
    processed: results.filter((item) => item.status === "accepted" || item.status === "failed" || item.status === "superseded").length,
    terminal: results.at(-1)!,
    results,
  };
}
