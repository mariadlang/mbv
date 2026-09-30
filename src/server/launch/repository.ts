import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  ClaimedEmailOutboxRow,
  CompleteEmailDeliveryInput,
  EmailOutboxPersistence,
} from "@/src/server/email/outbox";
import type {
  LaunchAccessPublicStatus,
  LaunchAccessRequestType,
} from "@/src/server/launch/schema";

const preparedRequestSchema = z.object({
  outcome: z.literal("prepared"),
  registration_id: z.string().uuid(),
  outbox_id: z.string().uuid(),
  recipient_email: z.string().email(),
  token_nonce: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  token_version: z.number().int().positive(),
  confirmation_expires_at: z.string().datetime({ offset: true }),
});

const requestOutcomeSchema = z.discriminatedUnion("outcome", [
  preparedRequestSchema,
  z.object({ outcome: z.literal("already_requested") }),
  z.object({ outcome: z.literal("request_received") }),
  z.object({ outcome: z.literal("newsletter_subscribed") }),
  z.object({ outcome: z.literal("campaign_closed") }),
  z.object({ outcome: z.literal("campaign_unavailable") }),
  z.object({ outcome: z.literal("rate_limited") }),
]);

const confirmationOutcomeSchema = z.enum(["email_confirmed", "expired", "invalid"]);

const claimedRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  recipient_kind: z.enum(["user", "admin"]),
  recipient_email: z.string().email(),
  template_key: z.literal("launch_confirmation"),
  dedupe_key: z.string().min(1).max(640),
  template_data: z.record(z.string(), z.unknown()),
  attempt_count: z.number().int().positive(),
  created_at: z.string().datetime({ offset: true }),
  claim_token: z.string().uuid(),
  claim_expires_at: z.string().datetime({ offset: true }),
});

const campaignStateSchema = z.object({
  state: z.enum(["draft", "collecting", "closed"]),
  registration_enabled: z.boolean(),
  newsletter_registration_enabled: z.boolean(),
  email_delivery_enabled: z.boolean(),
  total_slots: z.number().int().positive(),
  accepted_requests: z.number().int().nonnegative(),
  starts_at: z.string().datetime({ offset: true }).nullable(),
  ends_at: z.string().datetime({ offset: true }).nullable(),
});

function firstRow(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export type PrepareLaunchAccessResult =
  | {
    outcome: "prepared";
    registrationId: string;
    outboxId: string;
    recipientEmail: string;
    tokenNonce: string;
    tokenVersion: number;
    confirmationExpiresAt: string;
  }
  | { outcome: "already_requested" }
  | { outcome: "request_received" }
  | { outcome: "newsletter_subscribed" }
  | { outcome: "campaign_closed" }
  | { outcome: "campaign_unavailable" }
  | { outcome: "rate_limited" };

export interface PrepareLaunchAccessInput {
  campaignKey: string;
  email: string;
  emailFingerprint: string;
  clientFingerprint: string;
  newsletterOptIn: boolean;
  now: string;
  origin: "landing_launch";
  requestType: LaunchAccessRequestType;
}

export interface ConfirmLaunchAccessInput {
  campaignKey: string;
  registrationId: string;
  tokenVersion: number;
  tokenNonce: string;
  now: string;
}

export interface LaunchAccessRepository {
  prepare(input: PrepareLaunchAccessInput): Promise<PrepareLaunchAccessResult>;
  confirm(input: ConfirmLaunchAccessInput): Promise<"email_confirmed" | "expired" | "invalid">;
  publicState(campaignKey: string, now: Date): Promise<LaunchAccessPublicStatus>;
}

export class SupabaseLaunchAccessRepository implements LaunchAccessRepository {
  constructor(private readonly client: SupabaseClient) {}

  async prepare(input: PrepareLaunchAccessInput): Promise<PrepareLaunchAccessResult> {
    const { data, error } = await this.client.rpc("request_launch_access", {
      p_campaign_key: input.campaignKey,
      p_email: input.email,
      p_email_fingerprint: input.emailFingerprint,
      p_client_fingerprint: input.clientFingerprint,
      p_request_type: input.requestType,
      p_newsletter_opt_in: input.newsletterOptIn,
      p_origin: input.origin,
      p_now: input.now,
    });
    if (error) throw new Error("LAUNCH_REQUEST_PERSISTENCE_FAILED");
    const row = requestOutcomeSchema.parse(firstRow(data));
    if (row.outcome !== "prepared") return { outcome: row.outcome };
    return {
      outcome: row.outcome,
      registrationId: row.registration_id,
      outboxId: row.outbox_id,
      recipientEmail: row.recipient_email,
      tokenNonce: row.token_nonce,
      tokenVersion: row.token_version,
      confirmationExpiresAt: row.confirmation_expires_at,
    };
  }

  async confirm(input: ConfirmLaunchAccessInput): Promise<"email_confirmed" | "expired" | "invalid"> {
    const { data, error } = await this.client.rpc("confirm_launch_access_email", {
      p_campaign_key: input.campaignKey,
      p_registration_id: input.registrationId,
      p_token_version: input.tokenVersion,
      p_token_nonce: input.tokenNonce,
      p_now: input.now,
    });
    if (error) throw new Error("LAUNCH_CONFIRMATION_PERSISTENCE_FAILED");
    return confirmationOutcomeSchema.parse(z.object({ outcome: z.unknown() }).parse(firstRow(data)).outcome);
  }

  async publicState(campaignKey: string, now: Date): Promise<LaunchAccessPublicStatus> {
    const { data, error } = await this.client
      .from("launch_access_campaigns")
      .select("state,registration_enabled,newsletter_registration_enabled,email_delivery_enabled,total_slots,accepted_requests,starts_at,ends_at")
      .eq("campaign_key", campaignKey)
      .maybeSingle();
    if (error) throw new Error("LAUNCH_STATE_UNAVAILABLE");
    if (!data) return "unavailable";
    const campaign = campaignStateSchema.parse(data);
    const timestamp = now.getTime();
    const ended = campaign.ends_at !== null && new Date(campaign.ends_at).getTime() <= timestamp;
    if (ended) return "unavailable";
    const notStarted = campaign.starts_at !== null && new Date(campaign.starts_at).getTime() > timestamp;
    if (campaign.state === "draft" || notStarted) return "unavailable";
    if (campaign.state === "closed" || campaign.accepted_requests >= campaign.total_slots) {
      return campaign.newsletter_registration_enabled
        ? "closed"
        : "unavailable";
    }
    if (
      campaign.state !== "collecting"
      || !campaign.registration_enabled
    ) return "unavailable";
    return "open";
  }
}

export class LaunchConfirmationEmailPersistence implements EmailOutboxPersistence {
  constructor(private readonly outboxId: string) {}

  async claimNext(client: SupabaseClient, now: string): Promise<ClaimedEmailOutboxRow | null> {
    const { data, error } = await client.rpc("claim_launch_confirmation_email", {
      p_outbox_id: this.outboxId,
      p_now: now,
    });
    if (error) throw new Error("LAUNCH_EMAIL_CLAIM_FAILED");
    const candidate = firstRow(data);
    if (!candidate) return null;
    const row = claimedRowSchema.parse(candidate);
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

  async isStillRelevant(client: SupabaseClient, row: ClaimedEmailOutboxRow): Promise<boolean> {
    const { data, error } = await client.rpc("revalidate_launch_confirmation_email", {
      p_outbox_id: row.id,
      p_claim_token: row.claimToken,
    });
    if (error) throw new Error("LAUNCH_EMAIL_REVALIDATION_FAILED");
    return data === true;
  }

  async complete(client: SupabaseClient, input: CompleteEmailDeliveryInput): Promise<void> {
    const { error } = await client.rpc("complete_launch_confirmation_delivery", {
      p_outbox_id: input.outboxId,
      p_claim_token: input.claimToken,
      p_status: input.status,
      p_provider_message_id: input.providerMessageId,
      p_error_code: input.errorCode,
      p_next_retry_at: input.nextRetryAt,
    });
    if (error) throw new Error("LAUNCH_EMAIL_COMPLETION_FAILED");
  }
}
