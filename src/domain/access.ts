export type AccountRole = "user" | "superadmin";

/**
 * Estado comercial efectivo. Los tres valores legacy se conservan para que un
 * cliente desplegado antes que la migración siga interpretando respuestas del
 * servidor anterior sin conceder permisos nuevos por accidente.
 */
export type AccessStatus =
  | "free"
  | "eligible"
  | "pending_activation"
  | "trial_active"
  | "trial_expired"
  | "paid_monthly"
  | "paid_annual"
  | "payment_pending"
  | "payment_failed"
  | "cancellation_scheduled"
  | "subscription_ended"
  | "legacy_premium"
  | "blocked"
  | "trial"
  | "active"
  | "expired";

export type SubscriptionStatus =
  | "none"
  | "pending"
  | "active"
  | "past_due"
  | "failed"
  | "cancel_at_period_end"
  | "cancelled"
  | "ended";

export type CommercialEligibilityStatus = "tracking" | "eligible" | "activated" | "conflict_paid_premium";
export type CommercialPlanInterval = "monthly" | "annual";
export type PremiumSource = "promotional_trial" | "paid_subscription" | "legacy" | "superadmin";
export type CommercialActivityType =
  | "vision_updated"
  | "goal_created"
  | "goal_updated"
  | "habit_recorded"
  | "daily_action_created"
  | "daily_action_updated"
  | "daily_action_completed";
export type PremiumFeature = "five_year_planning" | "fitness_and_nutrition" | "finance" | "advanced_progress" | "recommendations";

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
  eligibilityStatus: CommercialEligibilityStatus | null;
  planInterval: CommercialPlanInterval | null;
  premiumSource: PremiumSource | null;
  campaignKey: string | null;
  currentStreakDays: number;
  eligibleAt: string | null;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  nextPaymentAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CommercialActivityResult {
  localDate: string;
  timezone: string;
  recorded: boolean;
  currentStreakDays: number;
  eligibilityStatus: CommercialEligibilityStatus | null;
  accessStatus: AccessStatus;
  periodStartedOn: string | null;
  periodEndedOn: string | null;
}

export const TRIAL_DAYS = 30;
export const TRIAL_PLANNING_MONTHS = 3;
export const TRIAL_PLANNING_LIMIT_MESSAGE = "Tu prueba anterior permite planificar dentro de un horizonte de 3 meses. Puedes consultar lo que ya existe fuera de ese periodo, sin modificarlo.";
export const COMMERCIAL_TRIAL_CONFIRMATION = "ACTIVAR_TRIAL_30_DIAS" as const;

export interface TrialPlanningDateBounds {
  min: string;
  max: string;
}

export const FREE_INCLUDED_CAPABILITIES = [
  "Visión",
  "Objetivos y metas",
  "Hábitos con registro cotidiano",
  "Mi día y Daily Plan",
  "Dashboard básico",
] as const;

/** @deprecated Alias temporal para consumidores del trial comercial anterior. */
export const TRIAL_INCLUDED_CAPABILITIES = FREE_INCLUDED_CAPABILITIES;

export const PREMIUM_AVAILABLE_CAPABILITIES = [
  "Todo lo incluido en Gratis",
  "Fitness y alimentación",
  "Finanzas",
  "Análisis avanzado de tu progreso",
  "Recomendaciones para ti",
] as const;

export const PREMIUM_FEATURE_COPY: Record<PremiumFeature, { title: string; description: string; available: boolean }> = {
  five_year_planning: {
    title: "Planificación a 5 años",
    description: "Esta capacidad histórica permanece protegida mientras se define su ubicación comercial definitiva.",
    available: true,
  },
  fitness_and_nutrition: {
    title: "Fitness y alimentación",
    description: "Registra comidas, entrenamientos y progreso corporal con Premium.",
    available: true,
  },
  finance: {
    title: "Finanzas",
    description: "Organiza cuentas, presupuestos y movimientos con Premium.",
    available: true,
  },
  advanced_progress: {
    title: "Análisis avanzado de tu progreso",
    description: "Profundiza en tendencias y evidencia de avance con Premium.",
    available: true,
  },
  recommendations: {
    title: "Recomendaciones para ti",
    description: "Recibe recomendaciones basadas en la información disponible en tu cuenta.",
    available: true,
  },
};

export const ACCESS_COMMUNICATION = {
  free: {
    title: "Plan Gratis",
    note: "Puedes usar las funciones esenciales sin iniciar una prueba ni registrar una tarjeta.",
  },
  eligible: {
    title: "Beneficio disponible",
    note: "Completaste 30 días consecutivos. La activación de Premium se revisa desde el panel administrativo.",
  },
  trial: {
    title: `Premium gratis por ${TRIAL_DAYS} días`,
    note: "No requiere tarjeta, no genera cobro y no se convierte automáticamente en una suscripción.",
  },
  expired: {
    title: "Tu acceso Premium gratis terminó.",
    note: "Tu información no se borró y las funciones del plan Gratis siguen disponibles.",
  },
} as const;

export const FEATURE_ACCESS_MATRIX: Record<PremiumFeature, { free: boolean; premium: boolean }> = {
  five_year_planning: { free: false, premium: true },
  fitness_and_nutrition: { free: false, premium: true },
  finance: { free: false, premium: true },
  advanced_progress: { free: false, premium: true },
  recommendations: { free: false, premium: true },
};

function hasValidEndDate(end: string | null, serverNow: string): boolean {
  if (!end) return false;
  const endTime = new Date(end).getTime();
  const serverTime = new Date(serverNow).getTime();
  return Number.isFinite(endTime) && Number.isFinite(serverTime) && endTime > serverTime;
}

export function isPremiumAccess(access: UserAccess): boolean {
  if (access.role === "superadmin") return true;
  if (access.accessStatus === "trial_active") {
    return hasValidEndDate(access.trialEndsAt, access.serverNow);
  }
  if (["paid_monthly", "paid_annual", "cancellation_scheduled"].includes(access.accessStatus)) {
    return hasValidEndDate(access.currentPeriodEndsAt, access.serverNow);
  }
  return access.accessStatus === "legacy_premium" || access.accessStatus === "active";
}

export function canAccessFeature(access: UserAccess, feature: PremiumFeature): boolean {
  if (access.role === "superadmin") return FEATURE_ACCESS_MATRIX[feature].premium;
  if (access.accessStatus === "blocked") return false;
  // Preserve the exact entitlement of legacy trials already granted before
  // the Gratis/Premium migration. Finance was included until their dated end.
  if (access.accessStatus === "trial" && feature === "finance") {
    return hasValidEndDate(access.trialEndsAt, access.serverNow);
  }
  return isPremiumAccess(access) ? FEATURE_ACCESS_MATRIX[feature].premium : FEATURE_ACCESS_MATRIX[feature].free;
}

export function remainingTrialDays(access: UserAccess): number | null {
  if (!(["trial", "trial_active"] as AccessStatus[]).includes(access.accessStatus) || !access.trialEndsAt) return null;
  const remaining = new Date(access.trialEndsAt).getTime() - new Date(access.serverNow).getTime();
  return Math.max(0, Math.ceil(remaining / 86_400_000));
}

function validPeriodKey(periodKey: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey);
}

/**
 * Gratis ya no hereda el horizonte de la prueba de 15 días. Sólo una prueba
 * legacy aún vigente conserva temporalmente esa restricción.
 */
export function isTrialPlanningMonthAllowed(access: UserAccess, periodKey: string): boolean {
  if (!validPeriodKey(periodKey)) return false;
  const [year, month] = periodKey.split("-").map(Number);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return false;
  if (access.accessStatus === "blocked") return false;
  if (access.accessStatus !== "trial") return true;
  if (!access.trialStartedAt) return false;
  const start = new Date(access.trialStartedAt);
  if (!Number.isFinite(start.getTime())) return false;
  const candidate = year * 12 + month - 1;
  const first = start.getFullYear() * 12 + start.getMonth();
  return candidate >= first && candidate < first + TRIAL_PLANNING_MONTHS;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTrialPlanningDateBounds(access: UserAccess): TrialPlanningDateBounds | null {
  if (access.accessStatus !== "trial" || !access.trialStartedAt) return null;
  const start = new Date(access.trialStartedAt);
  if (!Number.isFinite(start.getTime())) return null;
  return {
    min: localDateKey(new Date(start.getFullYear(), start.getMonth(), 1)),
    max: localDateKey(new Date(start.getFullYear(), start.getMonth() + TRIAL_PLANNING_MONTHS, 0)),
  };
}

export function isTrialPlanningDateAllowed(access: UserAccess, dateKey: string): boolean {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(dateKey);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999) return false;
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return false;
  return isTrialPlanningMonthAllowed(access, dateKey.slice(0, 7));
}

export function accessLabel(access: UserAccess): string {
  if (access.role === "superadmin") return "Superadmin";
  switch (access.accessStatus) {
    case "paid_monthly": return "Premium mensual";
    case "paid_annual": return "Premium anual";
    case "cancellation_scheduled": return "Premium · cancelación programada";
    case "trial_active": {
      const days = remainingTrialDays(access);
      return days === null ? "Premium gratis" : `Premium gratis · ${days} ${days === 1 ? "día" : "días"}`;
    }
    case "trial": {
      const days = remainingTrialDays(access);
      return days === null ? "Prueba anterior" : `Prueba anterior · ${days} ${days === 1 ? "día" : "días"}`;
    }
    case "eligible":
    case "pending_activation": return "Premium gratis pendiente de activación";
    case "payment_pending": return "Pago pendiente";
    case "payment_failed": return "Pago con novedad";
    case "blocked": return "Acceso bloqueado";
    case "legacy_premium":
    case "active": return "Premium";
    case "trial_expired":
    case "expired": return "Gratis · prueba finalizada";
    case "subscription_ended": return "Gratis · suscripción finalizada";
    default: return "Gratis";
  }
}
