import { getSupabaseBrowserClient } from "@/src/lib/supabaseBrowserClient";
import type { AdminAccountRow, AdminRepository } from "@/src/repositories/interfaces/AdminRepository";

export class SupabaseAdminRepository implements AdminRepository {
  private client = getSupabaseBrowserClient();

  async listAccounts(): Promise<AdminAccountRow[]> {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { data, error } = await this.client.rpc("admin_list_accounts");
    if (error) throw error;
    return (data ?? []).map((row: Record<string, string | null>) => ({
      userId: row.user_id!, email: row.email!, displayName: row.display_name!,
      role: row.role as AdminAccountRow["role"], accessStatus: row.access_status as AdminAccountRow["accessStatus"],
      subscriptionStatus: row.subscription_status as AdminAccountRow["subscriptionStatus"],
      trialEndsAt: row.trial_ends_at, updatedAt: row.updated_at!,
    }));
  }

  async setPremium(input: { userId: string; enabled: boolean; note?: string }) {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { error } = await this.client.rpc("admin_set_premium", { target_user_id: input.userId, enable_premium: input.enabled, audit_note: input.note ?? null });
    if (error) throw error;
  }
}
