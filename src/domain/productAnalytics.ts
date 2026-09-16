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
  "weekly_recap_viewed",
  "weekly_recap_completed",
  "return_experience_viewed",
  "return_experience_action_clicked",
  "share_card_opened",
  "share_card_generated",
  "share_card_customized",
  "share_exported",
  "share_native_started",
  "share_card_created",
  "share_card_shared",
  "referral_prompt_viewed",
  "referral_link_created",
  "referral_link_copied",
  "referral_share_started",
  "referral_visit_recorded",
  "experiment_exposure_recorded",
] as const;

export const serverProductEventNames = [
  "second_session_started",
  "activation_completed",
  "payment_confirmed",
  "subscription_renewal_due",
  "subscription_renewed",
  "referral_signup_completed",
  "referral_activation_completed",
] as const;
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

type MetadataKey = "source" | "route" | "view" | "section" | "period" | "result" | "version" | "surface" | "channel" | "experiment_id" | "variant" | "flag" | "referral_id" | "days_away";
type MetadataPolicy = Partial<Record<MetadataKey, readonly string[] | "route" | "referral" | "days" | "period">>;

const sources = {
  acquisition: ["landing_header", "landing_hero", "landing_footer", "trial"],
  auth: ["email_form", "google", "magic_link", "authenticated_access", "first_verified_access", "authenticated_app"],
  onboarding: ["welcome", "onboarding"],
  connectedAction: ["onboarding", "habit", "monthly_planning", "weekly_planning", "today", "goal"],
  premium: ["five_year_planning", "feed_hub", "upgrade_page"],
  server: ["server"],
} as const;
const p2Surfaces = ["dashboard", "progress", "weekly_plan"] as const;
const shareFormats = ["story", "feed", "square"] as const;
const shareViews = ["story", "feed", "square", "weekly", "habits", "progress"] as const;
const shareChannels = ["download", "native_share", "web_share", "fallback", "fallback_download"] as const;
const experimentIds = ["weekly_recap_v1", "return_experience_v1", "share_cards_v1", "referrals_v1", "premium_contextual_prompts_v1"] as const;
const featureFlags = ["weekly_recap", "return_experience", "share_cards", "referrals", "premium_contextual_prompts"] as const;
const variants = ["control", "treatment", "a", "b", "enabled", "disabled"] as const;
const version2 = ["2"] as const;
const appRoutes = ["/", "/signup", "/login", "/trial", "/upgrade", "/app/today", "/app/dashboard", "/app/planning/weekly", "/app/progress", "/app/journal"] as const;
const legacySafeValues: Partial<Record<MetadataKey, readonly string[]>> = { result: ["created"] };

const policy = (definition: MetadataPolicy): MetadataPolicy => definition;
const productMetadataPolicies: Record<ProductEventName, MetadataPolicy> = {
  landing_primary_cta_clicked: policy({ source: sources.acquisition, route: appRoutes, version: version2 }),
  signup_started: policy({ source: sources.auth, route: ["/signup"], version: version2 }),
  signup_completed: policy({ source: sources.auth, version: version2 }),
  sign_up_completed: policy({ source: sources.auth, version: version2 }),
  email_verified: policy({ source: sources.auth, version: version2 }),
  trial_started: policy({ source: sources.auth, version: version2 }),
  login_succeeded: policy({ source: sources.auth, version: version2 }),
  app_session_started: policy({ source: sources.auth, version: version2 }),
  onboarding_started: policy({ source: sources.onboarding, version: version2 }),
  onboarding_focus_selected: policy({ source: ["onboarding"], view: ["today", "goal", "week", "habit"], version: version2 }),
  first_outcome_created: policy({ source: ["onboarding"], view: ["today", "goal", "week", "habit"], version: version2 }),
  onboarding_completed: policy({ result: ["completed"], version: version2 }),
  first_action_created: policy({ source: sources.connectedAction, result: ["connected"], version: version2 }),
  first_action_completed: policy({ source: ["task_toggle"], version: version2 }),
  first_habit_recorded: policy({ source: ["habit_toggle", "habit_progress"], version: version2 }),
  action_rescheduled: policy({ source: ["task_edit", "priority_assignment", "reschedule"], version: version2 }),
  premium_gate_viewed: policy({ source: sources.premium, version: version2 }),
  upgrade_opened: policy({ source: ["upgrade_page"], route: ["/upgrade"], version: version2 }),
  checkout_started: policy({ source: ["upgrade_page"], route: ["/upgrade"], version: version2 }),
  goal_created: policy({}),
  annual_plan_updated: policy({ period: ["annual"], version: version2 }),
  monthly_plan_updated: policy({ period: ["monthly"], version: version2 }),
  week_planned: policy({ period: ["weekly"], version: version2 }),
  task_created: policy({ source: ["quick_add", "task_form"] }),
  task_completed: policy({ source: ["task_toggle"] }),
  today_view_opened: policy({ route: ["/app/today"] }),
  journal_entry_created: policy({}),
  progress_review_created: policy({ period: ["weekly", "monthly", "quarterly", "annual"] }),
  routine_created: policy({}),
  workout_completed: policy({}),
  meal_logged: policy({}),
  settings_updated: policy({ section: ["profile"] }),
  suggestion_submitted: policy({ section: ["suggestion"] }),
  bug_report_submitted: policy({ section: ["bug"] }),
  support_request_submitted: policy({ section: ["support"] }),
  weekly_recap_viewed: policy({ source: ["linked_entry", "weekly_plan", "weekly_review"], period: "period", surface: ["weekly_plan"], version: version2 }),
  weekly_recap_completed: policy({ source: ["weekly_review"], period: "period", result: ["saved", "saved_and_prepare"], surface: ["weekly_plan"], version: version2 }),
  return_experience_viewed: policy({ source: ["dashboard"], surface: ["dashboard"], days_away: "days", version: version2 }),
  return_experience_action_clicked: policy({ source: ["dashboard"], surface: ["dashboard"], result: ["pending", "priority", "minimum", "move", "release", "dismiss"], days_away: "days", version: version2 }),
  share_card_opened: policy({ surface: ["progress"], view: shareViews, version: version2 }),
  share_card_generated: policy({ surface: ["progress"], view: shareViews, channel: shareFormats, version: version2 }),
  share_card_customized: policy({ surface: ["progress"], view: shareViews, section: ["template", "format", "metrics", "headline"], version: version2 }),
  share_exported: policy({ surface: ["progress"], view: shareViews, channel: shareChannels, version: version2 }),
  share_native_started: policy({ surface: ["progress"], view: shareViews, channel: ["native_share", "web_share"], version: version2 }),
  share_card_created: policy({ surface: ["progress"], view: shareFormats, version: version2 }),
  share_card_shared: policy({ surface: ["progress"], view: shareFormats, channel: shareChannels, version: version2 }),
  referral_prompt_viewed: policy({ surface: ["progress"], version: version2 }),
  referral_link_created: policy({ surface: ["progress"], referral_id: "referral", version: version2 }),
  referral_link_copied: policy({ surface: ["progress"], channel: ["clipboard", "share_fallback"], version: version2 }),
  referral_share_started: policy({ surface: ["progress"], channel: ["native_share", "web_share", "clipboard"], version: version2 }),
  referral_visit_recorded: policy({ source: ["referral_link"], route: ["/signup"], referral_id: "referral", version: version2 }),
  experiment_exposure_recorded: policy({ surface: p2Surfaces, experiment_id: experimentIds, variant: variants, flag: featureFlags, version: version2 }),
  second_session_started: policy({ source: sources.server, version: version2 }),
  activation_completed: policy({ source: sources.server, result: ["completed"], version: version2 }),
  payment_confirmed: policy({ source: sources.server, channel: ["mercado_pago"], version: version2 }),
  subscription_renewal_due: policy({ source: sources.server, channel: ["mercado_pago"], version: version2 }),
  subscription_renewed: policy({ source: sources.server, channel: ["mercado_pago"], version: version2 }),
  referral_signup_completed: policy({ source: sources.server, referral_id: "referral", version: version2 }),
  referral_activation_completed: policy({ source: sources.server, referral_id: "referral", version: version2 }),
};

const opaqueReferralPattern = /^ref_[a-f0-9]{32,64}$/;
const safePeriodPattern = /^(?:\d{4}-\d{2}-\d{2}|\d{4}-W\d{2}|weekly|monthly|quarterly|annual)$/;

function sanitizeMetadataValue(rule: MetadataPolicy[MetadataKey], key: MetadataKey, value: string | number | boolean): string | null {
  if (rule === "route") {
    const route = String(value).split(/[?#]/, 1)[0];
    return route.startsWith("/") && route.length <= 200 ? route : null;
  }
  if (rule === "referral") {
    const referralId = String(value);
    return opaqueReferralPattern.test(referralId) ? referralId : null;
  }
  if (rule === "days") {
    const daysAway = typeof value === "number" ? value : Number(value);
    return Number.isInteger(daysAway) && daysAway >= 0 && daysAway <= 3650 ? String(daysAway) : null;
  }
  if (rule === "period") {
    const period = String(value);
    return safePeriodPattern.test(period) ? period : null;
  }
  const normalized = key === "route" ? String(value).split(/[?#]/, 1)[0] : String(value);
  return rule?.includes(normalized) ? normalized : null;
}

/**
 * Sanitiza por evento con vocabularios cerrados. El segundo argumento es
 * opcional para conservar compatibilidad con consumidores antiguos; aun sin él
 * sólo sobreviven valores presentes en alguna política, nunca texto libre.
 */
export function sanitizeProductMetadata(input: Record<string, unknown>, eventName?: ProductEventName) {
  let effectivePolicy: MetadataPolicy;
  if (eventName) {
    effectivePolicy = productMetadataPolicies[eventName];
  } else {
    effectivePolicy = {};
    for (const key of Object.keys(input)) {
      const metadataKey = key as MetadataKey;
      const rules = Object.values(productMetadataPolicies)
        .map((item) => item[metadataKey])
        .filter((rule): rule is NonNullable<MetadataPolicy[MetadataKey]> => Boolean(rule));
      if (!rules.length) continue;
      if (rules.some((rule) => rule === "referral")) effectivePolicy[metadataKey] = "referral";
      else if (rules.some((rule) => rule === "days")) effectivePolicy[metadataKey] = "days";
      else if (rules.some((rule) => rule === "period")) effectivePolicy[metadataKey] = "period";
      else {
        const values = [...rules.flatMap((rule) => typeof rule === "string" ? [] : [...rule]), ...(legacySafeValues[metadataKey] ?? [])];
        effectivePolicy[metadataKey] = Array.from(new Set(values));
      }
    }
  }
  return Object.fromEntries(Object.entries(input).flatMap(([key, value]) => {
    if (!["string", "number", "boolean"].includes(typeof value)) return [];
    const metadataKey = key as MetadataKey;
    const rule = effectivePolicy[metadataKey];
    if (!rule) return [];
    const safeValue = sanitizeMetadataValue(rule, metadataKey, value as string | number | boolean);
    if (safeValue === null) return [];
    return [[key, safeValue]];
  }));
}
