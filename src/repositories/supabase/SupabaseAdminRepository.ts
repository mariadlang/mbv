import { getSupabaseBrowserClient } from "@/src/lib/supabaseBrowserClient";
import type { AdminAccountRow, AdminRepository, AdminTrialActivationResult } from "@/src/repositories/interfaces/AdminRepository";

export class SupabaseAdminRepository implements AdminRepository {
  private client = getSupabaseBrowserClient();

  async listAccounts(): Promise<AdminAccountRow[]> {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { data, error } = await this.client.rpc("admin_list_commercial_access");
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      userId: String(row.user_id),
      email: String(row.email ?? ""),
      displayName: String(row.display_name ?? ""),
      role: row.role === "superadmin" ? "superadmin" : "user",
      accessStatus: row.access_status as AdminAccountRow["accessStatus"],
      subscriptionStatus: row.subscription_status as AdminAccountRow["subscriptionStatus"],
      trialStartedAt: typeof row.trial_started_at === "string" ? row.trial_started_at : null,
      trialEndsAt: typeof row.trial_ends_at === "string" ? row.trial_ends_at : null,
      eligibilityStatus: (row.eligibility_status ?? null) as AdminAccountRow["eligibilityStatus"],
      eligibleAt: typeof row.eligible_at === "string" ? row.eligible_at : null,
      eligibilityPeriodStartedOn: typeof row.eligibility_period_started_on === "string" ? row.eligibility_period_started_on : null,
      eligibilityPeriodEndedOn: typeof row.eligibility_period_ended_on === "string" ? row.eligibility_period_ended_on : null,
      campaignKey: typeof row.campaign_key === "string" ? row.campaign_key : null,
      fixedTimezone: typeof row.fixed_timezone === "string" ? row.fixed_timezone : null,
      currentStreakDays: Number(row.current_streak_days ?? 0),
      trialGrantedAt: typeof row.trial_granted_at === "string" ? row.trial_granted_at : null,
      planInterval: (row.plan_interval ?? null) as AdminAccountRow["planInterval"],
      conflictReason: typeof row.conflict_reason === "string" ? row.conflict_reason : null,
      updatedAt: String(row.updated_at),
    }));
  }

  async activateCommercialTrial(input: Parameters<AdminRepository["activateCommercialTrial"]>[0]): Promise<AdminTrialActivationResult> {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { data, error } = await this.client.rpc("admin_activate_commercial_trial", {
      target_user_id: input.userId,
      target_campaign_key: input.campaignKey,
      confirmation: input.confirmation,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("TRIAL_ACTIVATION_NOT_AVAILABLE");
    return {
      outcome: row.outcome,
      userId: row.user_id,
      campaignKey: row.campaign_key,
      trialStartedAt: row.trial_started_at ?? null,
      trialEndsAt: row.trial_ends_at ?? null,
      accessStatus: row.access_status,
    };
  }
}
