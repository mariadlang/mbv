import type { FeedbackTicket, SupportFaq } from "@/src/domain/support";

export interface PlatformSummary {
  total_users: number;
  new_users_week: number;
  new_users_month: number;
  active_today: number;
  active_7d: number;
  weekly_active_users: number;
  active_30d: number;
  analytics_v2_cohort_users: number;
  onboarding_rate: number | null;
  activation_rate: number | null;
  retention_1d_eligible_users: number;
  retention_1d_users: number;
  retention_1d: number | null;
  retention_7d_eligible_users: number;
  retention_7d_users: number;
  retention_7d: number | null;
  retention_30d_eligible_users: number;
  retention_30d_users: number;
  retention_30d: number | null;
  weekly_review_eligible_users: number;
  weekly_review_users: number;
  weekly_review_events: number;
  weekly_review_rate: number | null;
  share_eligible_users: number;
  share_users: number;
  share_events: number;
  share_rate: number | null;
  paywall_view_users: number;
  checkout_users: number;
  payment_users: number;
  paywall_to_checkout_rate: number | null;
  checkout_to_payment_rate: number | null;
  trial_users: number;
  trial_conversion_rate: number | null;
  renewal_eligible_users: number;
  renewal_users: number;
  renewal_rate: number | null;
  referral_visit_users: number;
  referral_signup_users: number;
  referral_activation_users: number;
  referral_signup_rate: number | null;
  referral_activation_rate: number | null;
  pending_suggestions: number;
  open_support: number;
}
export interface PlatformUser { user_id: string; email: string; display_name: string; created_at: string; last_active_at: string | null; locale: string; timezone: string; onboarding_completed: boolean; activated: boolean; session_count: number; goals_created: number; tasks_completed: number; top_feature: string; marketing_consent: boolean; account_status: string }
export interface PlatformUsage { feature: string; unique_users: number; event_count: number; last_used: string | null; users_7d: number; users_30d: number; observable_users: number; adoption_rate: number }
export interface PlatformTicket extends FeedbackTicket { email?: string; displayName?: string; similarCount?: number }
export interface PlatformCategory { id: string; name: string; appliesTo: string[]; active: boolean; sortOrder: number }
export interface PlatformSetting { key: string; value: unknown; updatedAt: string }
export interface PlatformAudit { id: string; action: string; entityType: string; entityId: string | null; createdAt: string }
export interface PlatformData { summary: PlatformSummary; users: PlatformUser[]; usage: PlatformUsage[]; tickets: PlatformTicket[]; faqs: SupportFaq[]; categories: PlatformCategory[]; settings: PlatformSetting[]; audit: PlatformAudit[] }
