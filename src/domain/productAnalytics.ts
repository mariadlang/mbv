export const productEventNames = ["sign_up_completed", "onboarding_started", "onboarding_completed", "goal_created", "annual_plan_updated", "monthly_plan_updated", "week_planned", "task_created", "task_completed", "today_view_opened", "journal_entry_created", "progress_review_created", "routine_created", "workout_completed", "meal_logged", "settings_updated", "suggestion_submitted", "bug_report_submitted", "support_request_submitted", "app_session_started"] as const;
export type ProductEventName = typeof productEventNames[number];

export const ACTIVATION_DEFINITION = { windowDays: 7, requiresOnboarding: true, minimumGoals: 1, minimumCompletedActions: 1 } as const;

export function sanitizeProductMetadata(input: Record<string, unknown>) {
  const allowed = new Set(["source", "route", "view", "section", "period", "result", "version"]);
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => allowed.has(key) && ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => [key, String(value).slice(0, 200)]));
}
