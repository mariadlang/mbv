import type { FeedbackTicket, SupportFaq } from "@/src/domain/support";

export interface PlatformSummary { total_users: number; new_users_week: number; new_users_month: number; active_today: number; active_7d: number; active_30d: number; onboarding_rate: number; activation_rate: number; retention_7d: number; retention_30d: number; pending_suggestions: number; open_support: number }
export interface PlatformUser { user_id: string; email: string; display_name: string; created_at: string; last_active_at: string | null; locale: string; timezone: string; onboarding_completed: boolean; activated: boolean; session_count: number; goals_created: number; tasks_completed: number; top_feature: string; marketing_consent: boolean; account_status: string }
export interface PlatformUsage { feature: string; unique_users: number; event_count: number; last_used: string | null; users_7d: number; users_30d: number }
export interface PlatformTicket extends FeedbackTicket { email?: string; displayName?: string; similarCount?: number }
export interface PlatformCategory { id: string; name: string; appliesTo: string[]; active: boolean; sortOrder: number }
export interface PlatformSetting { key: string; value: unknown; updatedAt: string }
export interface PlatformAudit { id: string; action: string; entityType: string; entityId: string | null; createdAt: string }
export interface PlatformData { summary: PlatformSummary; users: PlatformUser[]; usage: PlatformUsage[]; tickets: PlatformTicket[]; faqs: SupportFaq[]; categories: PlatformCategory[]; settings: PlatformSetting[]; audit: PlatformAudit[] }
