export type AccountRole = "user" | "superadmin";
export type AccessStatus = "trial" | "active" | "expired" | "blocked";
export type SubscriptionStatus = "none" | "pending" | "active" | "cancelled";
export type PremiumFeature = "five_year_planning" | "feed_hub";

export interface UserAccess {
  userId: string;
  email: string;
  displayName: string;
  role: AccountRole;
  accessStatus: AccessStatus;
  subscriptionStatus: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  serverNow: string;
}

export const TRIAL_DAYS = 15;
export const TRIAL_PLANNING_MONTHS = 3;
export const FEATURE_ACCESS_MATRIX: Record<PremiumFeature, { trial: boolean; premium: boolean }> = {
  five_year_planning: { trial: false, premium: true },
  feed_hub: { trial: false, premium: true },
};

export function isPremiumAccess(access: UserAccess): boolean {
  return access.role === "superadmin" || access.accessStatus === "active";
}

export function canAccessFeature(access: UserAccess, feature: PremiumFeature): boolean {
  if (access.accessStatus === "blocked" || access.accessStatus === "expired") return false;
  return isPremiumAccess(access) ? FEATURE_ACCESS_MATRIX[feature].premium : FEATURE_ACCESS_MATRIX[feature].trial;
}

export function remainingTrialDays(access: UserAccess): number | null {
  if (access.accessStatus !== "trial" || !access.trialEndsAt) return null;
  const remaining = new Date(access.trialEndsAt).getTime() - new Date(access.serverNow).getTime();
  return Math.max(0, Math.ceil(remaining / 86_400_000));
}

export function isTrialPlanningMonthAllowed(access: UserAccess, periodKey: string): boolean {
  if (isPremiumAccess(access)) return true;
  if (access.accessStatus !== "trial" || !access.trialStartedAt) return false;
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return false;
  const start = new Date(access.trialStartedAt);
  const candidate = year * 12 + month - 1;
  const first = start.getUTCFullYear() * 12 + start.getUTCMonth();
  return candidate >= first && candidate < first + TRIAL_PLANNING_MONTHS;
}

export function accessLabel(access: UserAccess): string {
  if (access.role === "superadmin") return "Superadmin";
  if (access.accessStatus === "active") return "Premium";
  if (access.accessStatus === "trial") {
    const days = remainingTrialDays(access);
    return days === null ? "Prueba" : `Prueba · ${days} ${days === 1 ? "día" : "días"}`;
  }
  if (access.accessStatus === "blocked") return "Acceso bloqueado";
  return "Prueba finalizada";
}
