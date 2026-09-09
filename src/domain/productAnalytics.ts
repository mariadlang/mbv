export const clientProductEventNames = [
  "landing_primary_cta_clicked",
  "signup_started",
  "signup_completed",
  "email_verified",
  "trial_started",
  "onboarding_started",
  "onboarding_focus_selected",
  "first_outcome_created",
  "first_action_created",
  "first_action_completed",
  "first_habit_recorded",
  "action_rescheduled",
  "premium_gate_viewed",
  "upgrade_opened",
  "checkout_started",
  "login_succeeded",
  "onboarding_completed",
  "goal_created",
  "annual_plan_updated",
  "monthly_plan_updated",
  "week_planned",
  "task_created",
  "task_completed",
  "today_view_opened",
  "journal_entry_created",
  "progress_review_created",
  "routine_created",
  "workout_completed",
  "meal_logged",
  "settings_updated",
  "suggestion_submitted",
  "bug_report_submitted",
  "support_request_submitted",
  "app_session_started",
  "sign_up_completed",
] as const;

export const serverProductEventNames = ["second_session_started", "activation_completed", "payment_confirmed"] as const;
export const productEventNames = [...clientProductEventNames, ...serverProductEventNames] as const;

export type ClientProductEventName = typeof clientProductEventNames[number];
export type ProductEventName = typeof productEventNames[number];

export const ACTIVATION_DEFINITION = {
  version: 2,
  windowDays: 7,
  requiresOnboarding: true,
  requiresConnectedAction: true,
  acceptedProgressEvents: ["first_action_completed", "first_habit_recorded", "action_rescheduled"],
  requiresSecondSession: true,
  requiresGoal: false,
} as const;

export interface ActivationEvent {
  eventName: ProductEventName;
  occurredAt: string | Date;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivationEvaluation {
  activated: boolean;
  onboardingCompleted: boolean;
  connectedActionCreated: boolean;
  consciousProgressRecorded: boolean;
  secondSessionStarted: boolean;
}

export function evaluateActivation(events: ActivationEvent[], accountCreatedAt: string | Date): ActivationEvaluation {
  const start = new Date(accountCreatedAt).getTime();
  if (!Number.isFinite(start)) return { activated: false, onboardingCompleted: false, connectedActionCreated: false, consciousProgressRecorded: false, secondSessionStarted: false };
  const end = start + ACTIVATION_DEFINITION.windowDays * 86_400_000;
  const eligible = events.filter((event) => {
    const occurredAt = new Date(event.occurredAt).getTime();
    return Number.isFinite(occurredAt) && occurredAt >= start && occurredAt <= end;
  });
  const names = new Set(eligible.map((event) => event.eventName));
  const sessionIds = new Set(eligible.filter((event) => event.eventName === "app_session_started" && event.sessionId).map((event) => event.sessionId));
  const connectedSources = new Set(["onboarding", "habit", "monthly_planning", "weekly_planning", "today", "goal"]);
  const evaluation = {
    onboardingCompleted: names.has("onboarding_completed"),
    connectedActionCreated: eligible.some((event) => event.eventName === "first_action_created" && (
      event.metadata?.result === "connected" ||
      connectedSources.has(String(event.metadata?.source ?? ""))
    )),
    consciousProgressRecorded: ACTIVATION_DEFINITION.acceptedProgressEvents.some((eventName) => names.has(eventName)),
    secondSessionStarted: names.has("second_session_started") || sessionIds.size >= 2,
  };
  return { ...evaluation, activated: Object.values(evaluation).every(Boolean) };
}

export function isActivationComplete(events: ActivationEvent[], accountCreatedAt: string | Date): boolean {
  return evaluateActivation(events, accountCreatedAt).activated;
}

const allowedMetadataKeys = new Set(["source", "route", "view", "section", "period", "result", "version"]);

export function sanitizeProductMetadata(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).flatMap(([key, value]) => {
    if (!allowedMetadataKeys.has(key) || !["string", "number", "boolean"].includes(typeof value)) return [];
    let safeValue = String(value).slice(0, 200);
    if (key === "route") safeValue = safeValue.split(/[?#]/, 1)[0].slice(0, 200);
    if (/@/.test(safeValue)) safeValue = "redacted";
    return [[key, safeValue]];
  }));
}
