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
export const TRIAL_PLANNING_LIMIT_MESSAGE = "Tu prueba permite planificar dentro de un horizonte de 3 meses. Puedes consultar lo que ya existe fuera de ese periodo, sin modificarlo.";

export interface TrialPlanningDateBounds {
  min: string;
  max: string;
}

export const TRIAL_INCLUDED_CAPABILITIES = [
  "Planificación mensual, semanal y diaria",
  "Horizonte de planificación de hasta 3 meses",
  "Visión y metas",
  "Hábitos",
  "Diario y notas",
  "Proyectos y tareas",
  "Progreso",
  "Bienestar",
  "Finanzas",
] as const;

export const PREMIUM_AVAILABLE_CAPABILITIES = [
  "Todo lo incluido en la prueba",
  "Planificación a 5 años",
] as const;

export const PREMIUM_FEATURE_COPY: Record<PremiumFeature, { title: string; description: string; available: boolean }> = {
  five_year_planning: {
    title: "Planificación a 5 años",
    description: "Amplía tu horizonte más allá de los 3 meses incluidos en la prueba.",
    available: true,
  },
  feed_hub: {
    title: "Feed Hub",
    description: "Función Premium identificada técnicamente, todavía no accesible desde la navegación actual.",
    available: false,
  },
};

export const ACCESS_COMMUNICATION = {
  trial: {
    title: `Prueba de ${TRIAL_DAYS} días`,
    note: "Sin tarjeta y sin cobro automático. Empieza con el primer acceso después de verificar el correo.",
  },
  expired: {
    title: `Tu prueba de ${TRIAL_DAYS} días terminó.`,
    note: "Tu información local no se borró: permanece en este dispositivo. Puedes revisar Premium cuando tenga sentido para ti.",
  },
} as const;

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
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)) return false;
  const [year, month] = periodKey.split("-").map(Number);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return false;
  if (isPremiumAccess(access)) return true;
  if (access.accessStatus !== "trial" || !access.trialStartedAt) return false;
  const start = new Date(access.trialStartedAt);
  if (!Number.isFinite(start.getTime())) return false;
  const candidate = year * 12 + month - 1;
  // Los periodKey del planner representan el calendario local de la usuaria.
  // Usar UTC aquí desplaza el mes para accesos iniciados cerca de medianoche.
  const first = start.getFullYear() * 12 + start.getMonth();
  return candidate >= first && candidate < first + TRIAL_PLANNING_MONTHS;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTrialPlanningDateBounds(access: UserAccess): TrialPlanningDateBounds | null {
  if (isPremiumAccess(access) || access.accessStatus !== "trial" || !access.trialStartedAt) return null;
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
  if (access.accessStatus === "active") return "Premium";
  if (access.accessStatus === "trial") {
    const days = remainingTrialDays(access);
    return days === null ? "Prueba" : `Prueba · ${days} ${days === 1 ? "día" : "días"}`;
  }
  if (access.accessStatus === "blocked") return "Acceso bloqueado";
  return "Prueba finalizada";
}
