import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  LaunchAccessPublicStatus,
  LaunchAccessRequestType,
} from "@/src/server/launch/schema";

const requestOutcomeSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("request_received") }),
  z.object({ outcome: z.literal("newsletter_subscribed") }),
  z.object({ outcome: z.literal("campaign_closed") }),
  z.object({ outcome: z.literal("campaign_unavailable") }),
  z.object({ outcome: z.literal("rate_limited") }),
  z.object({ outcome: z.literal("request_mismatch") }),
]);

const campaignStateSchema = z.object({
  state: z.enum(["draft", "collecting", "closed"]),
  registration_enabled: z.boolean(),
  newsletter_registration_enabled: z.boolean(),
  email_delivery_enabled: z.boolean(),
  total_slots: z.number().int().positive(),
  accepted_requests: z.number().int().nonnegative(),
  starts_at: z.string().datetime({ offset: true }).nullable(),
  ends_at: z.string().datetime({ offset: true }).nullable(),
  updated_at: z.string().datetime({ offset: true }),
});

function firstRow(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function addOneUtcYearClamped(value: string): number {
  const result = new Date(value);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCFullYear(result.getUTCFullYear() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result.getTime();
}

export type PrepareLaunchAccessResult = z.infer<typeof requestOutcomeSchema>;

export interface PrepareLaunchAccessInput {
  campaignKey: string;
  email: string;
  clientFingerprint: string;
  requestFingerprint: string;
  payloadFingerprint: string;
  newsletterOptIn: boolean;
  now: string;
  origin: "landing_launch";
  requestType: LaunchAccessRequestType;
}

export interface LaunchAccessRepository {
  prepare(input: PrepareLaunchAccessInput): Promise<PrepareLaunchAccessResult>;
  publicState(campaignKey: string, now: Date): Promise<LaunchAccessPublicStatus>;
}

export class SupabaseLaunchAccessRepository implements LaunchAccessRepository {
  constructor(private readonly client: SupabaseClient) {}

  async purgeExpired(now: string): Promise<void> {
    const { error } = await this.client.rpc("purge_launch_access_expired", { p_now: now });
    if (error) throw new Error("LAUNCH_RETENTION_PURGE_FAILED");
  }

  async prepare(input: PrepareLaunchAccessInput): Promise<PrepareLaunchAccessResult> {
    const { data, error } = await this.client.rpc("request_launch_access", {
      p_campaign_key: input.campaignKey,
      p_email: input.email,
      p_client_fingerprint: input.clientFingerprint,
      p_request_fingerprint: input.requestFingerprint,
      p_payload_fingerprint: input.payloadFingerprint,
      p_request_type: input.requestType,
      p_newsletter_opt_in: input.newsletterOptIn,
      p_origin: input.origin,
      p_now: input.now,
    });
    if (error) throw new Error("LAUNCH_REQUEST_PERSISTENCE_FAILED");
    return requestOutcomeSchema.parse(firstRow(data));
  }

  async publicState(campaignKey: string, now: Date): Promise<LaunchAccessPublicStatus> {
    const { data, error } = await this.client
      .from("launch_access_campaigns")
      .select("state,registration_enabled,newsletter_registration_enabled,email_delivery_enabled,total_slots,accepted_requests,starts_at,ends_at,updated_at")
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
      if (addOneUtcYearClamped(campaign.updated_at) <= timestamp) return "unavailable";
      return campaign.newsletter_registration_enabled ? "closed" : "unavailable";
    }
    if (campaign.state !== "collecting" || !campaign.registration_enabled) return "unavailable";
    return "open";
  }
}
