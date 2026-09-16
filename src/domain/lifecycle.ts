export const lifecyclePreferenceKeys = [
  "product",
  "reminders",
  "weekly_summary",
  "news",
  "marketing",
] as const;

export type LifecyclePreferenceKey = typeof lifecyclePreferenceKeys[number];

export interface LifecyclePreferences {
  product: boolean;
  reminders: boolean;
  weekly_summary: boolean;
  news: boolean;
  marketing: boolean;
}

export const DEFAULT_LIFECYCLE_PREFERENCES: LifecyclePreferences = Object.freeze({
  product: true,
  reminders: false,
  weekly_summary: false,
  news: false,
  marketing: false,
});

export const lifecycleMessageIds = [
  "welcome",
  "first_day",
  "first_week",
  "trial_ending",
  "premium_started",
  "return_after_inactivity",
  "weekly_review",
  "monthly_review",
  "achievement",
  "payment_pending",
  "payment_failed",
  "subscription_cancelled",
  "subscription_renewed",
  "support_follow_up",
  "password_recovery",
] as const;

export type LifecycleMessageId = typeof lifecycleMessageIds[number];
export type LifecycleChannel = "in_app" | "email";

export interface LifecycleRule {
  id: LifecycleMessageId;
  trigger: string;
  message: string;
  cta: string;
  channel: LifecycleChannel;
  preference: LifecyclePreferenceKey;
  maxPerWindow: number;
  windowDays: number;
  cooldownHours: number;
  marketing: boolean;
  transactional: boolean;
}

/**
 * Product specification only. Email delivery is intentionally not implemented
 * until an approved provider and persisted consent model exist.
 */
export const LIFECYCLE_RULES: readonly LifecycleRule[] = Object.freeze([
  { id: "welcome", trigger: "account_created", message: "Tu espacio ya está listo. Empecemos por una sola cosa.", cta: "Elegir mi primera acción", channel: "in_app", preference: "product", maxPerWindow: 1, windowDays: 3650, cooldownHours: 0, marketing: false, transactional: false },
  { id: "first_day", trigger: "first_action_available", message: "Hoy puede empezar con una acción que sí tenga sentido para ti.", cta: "Ir a Mi día", channel: "in_app", preference: "product", maxPerWindow: 1, windowDays: 30, cooldownHours: 0, marketing: false, transactional: false },
  { id: "first_week", trigger: "first_week_elapsed", message: "Ya hay una primera semana para mirar con calma.", cta: "Revisar mi semana", channel: "in_app", preference: "weekly_summary", maxPerWindow: 1, windowDays: 30, cooldownHours: 0, marketing: false, transactional: false },
  { id: "trial_ending", trigger: "trial_window_near_end", message: "Tu prueba está por terminar. Puedes revisar qué incluye cada opción antes de decidir.", cta: "Ver mis opciones", channel: "in_app", preference: "product", maxPerWindow: 2, windowDays: 14, cooldownHours: 72, marketing: false, transactional: false },
  { id: "premium_started", trigger: "payment_confirmed", message: "Tu pago fue confirmado y Premium ya está activo en tu espacio.", cta: "Ver mi suscripción", channel: "in_app", preference: "product", maxPerWindow: 1, windowDays: 3650, cooldownHours: 0, marketing: false, transactional: true },
  { id: "return_after_inactivity", trigger: "eligible_return", message: "Qué bueno tenerte por aquí. Veamos qué sigue teniendo sentido.", cta: "Retomar con calma", channel: "in_app", preference: "product", maxPerWindow: 1, windowDays: 7, cooldownHours: 0, marketing: false, transactional: false },
  { id: "weekly_review", trigger: "week_ready_for_review", message: "Tu semana está lista para una revisión breve, cuando quieras.", cta: "Revisar mi semana", channel: "in_app", preference: "weekly_summary", maxPerWindow: 1, windowDays: 7, cooldownHours: 0, marketing: false, transactional: false },
  { id: "monthly_review", trigger: "month_ready_for_review", message: "Ya puedes mirar el mes y elegir qué merece espacio ahora.", cta: "Revisar el mes", channel: "in_app", preference: "reminders", maxPerWindow: 1, windowDays: 28, cooldownHours: 0, marketing: false, transactional: false },
  { id: "achievement", trigger: "milestone_completed", message: "Esto sí avanzó. Puedes reconocerlo sin convertirlo en una exigencia.", cta: "Ver mi progreso", channel: "in_app", preference: "product", maxPerWindow: 2, windowDays: 7, cooldownHours: 24, marketing: false, transactional: false },
  { id: "payment_pending", trigger: "payment_pending", message: "Tu pago sigue pendiente. Puedes revisar el estado sin volver a intentarlo de inmediato.", cta: "Revisar estado", channel: "in_app", preference: "product", maxPerWindow: 2, windowDays: 7, cooldownHours: 24, marketing: false, transactional: true },
  { id: "payment_failed", trigger: "payment_failed", message: "El pago no pudo confirmarse. Tu información sigue aquí.", cta: "Revisar el pago", channel: "in_app", preference: "product", maxPerWindow: 2, windowDays: 7, cooldownHours: 24, marketing: false, transactional: true },
  { id: "subscription_cancelled", trigger: "subscription_cancelled", message: "La cancelación quedó registrada. Puedes seguir usando tu acceso hasta la fecha indicada.", cta: "Ver mi suscripción", channel: "in_app", preference: "product", maxPerWindow: 4, windowDays: 365, cooldownHours: 0, marketing: false, transactional: true },
  { id: "subscription_renewed", trigger: "subscription_renewed", message: "Tu suscripción fue renovada.", cta: "Ver mi suscripción", channel: "in_app", preference: "product", maxPerWindow: 12, windowDays: 365, cooldownHours: 0, marketing: false, transactional: true },
  { id: "support_follow_up", trigger: "support_response_available", message: "Hay una respuesta disponible para tu solicitud.", cta: "Ver respuesta", channel: "in_app", preference: "product", maxPerWindow: 3, windowDays: 7, cooldownHours: 8, marketing: false, transactional: true },
  { id: "password_recovery", trigger: "password_recovery_requested", message: "Usa el enlace de recuperación únicamente si tú lo solicitaste.", cta: "Restablecer contraseña", channel: "email", preference: "product", maxPerWindow: 3, windowDays: 1, cooldownHours: 1, marketing: false, transactional: true },
]);

export interface LifecycleDeliveryRecord {
  messageId: LifecycleMessageId;
  deliveredAt: string;
  triggerKey: string;
}

export interface LifecycleEligibilityInput {
  rule: LifecycleRule;
  preferences: LifecyclePreferences;
  marketingConsent: boolean;
  history: readonly LifecycleDeliveryRecord[];
  triggerKey: string;
  now?: Date;
}

export type LifecycleEligibilityReason =
  | "eligible"
  | "preference_disabled"
  | "marketing_consent_required"
  | "duplicate_trigger"
  | "cooldown"
  | "frequency_cap";

export interface LifecycleEligibility {
  eligible: boolean;
  reason: LifecycleEligibilityReason;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function evaluateLifecycleEligibility({
  rule,
  preferences,
  marketingConsent,
  history,
  triggerKey,
  now = new Date(),
}: LifecycleEligibilityInput): LifecycleEligibility {
  if (!rule.transactional && !preferences[rule.preference]) return { eligible: false, reason: "preference_disabled" };
  if (rule.marketing && !marketingConsent) return { eligible: false, reason: "marketing_consent_required" };

  const nowMs = now.getTime();
  const validHistory = history.filter((record) => Number.isFinite(Date.parse(record.deliveredAt)));
  if (validHistory.some((record) => record.triggerKey === triggerKey)) return { eligible: false, reason: "duplicate_trigger" };
  const sameMessageHistory = validHistory.filter((record) => record.messageId === rule.id);

  const latest = sameMessageHistory.reduce<number | null>((current, record) => {
    const timestamp = Date.parse(record.deliveredAt);
    return current === null || timestamp > current ? timestamp : current;
  }, null);
  if (latest !== null && nowMs - latest < rule.cooldownHours * HOUR_MS) return { eligible: false, reason: "cooldown" };

  const windowStart = nowMs - rule.windowDays * DAY_MS;
  const deliveriesInWindow = sameMessageHistory.filter((record) => {
    const timestamp = Date.parse(record.deliveredAt);
    return timestamp >= windowStart && timestamp <= nowMs;
  }).length;
  if (deliveriesInWindow >= rule.maxPerWindow) return { eligible: false, reason: "frequency_cap" };

  return { eligible: true, reason: "eligible" };
}
