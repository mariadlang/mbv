import type { PlannerSnapshot } from "@/src/domain/planner";
import { calculateGoalProgress } from "@/src/domain/rules";

export const SHARE_CARD_FORMATS = {
  story: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
} as const;

export type ShareCardFormat = keyof typeof SHARE_CARD_FORMATS;

export const SHARE_CARD_TEMPLATES = ["weekly", "habits", "progress"] as const;
export type ShareCardTemplate = typeof SHARE_CARD_TEMPLATES[number];

export const SHARE_CARD_METRIC_KEYS = [
  "completed_tasks",
  "habit_checkins",
  "habit_consistency",
  "intentional_days",
  "goal_progress",
] as const;

export type ShareCardMetricKey = typeof SHARE_CARD_METRIC_KEYS[number];

export const DEFAULT_SHARE_CARD_METRICS: readonly ShareCardMetricKey[] = [
  "completed_tasks",
  "habit_checkins",
  "intentional_days",
];

export interface ShareCardMetric {
  key: ShareCardMetricKey;
  value: number;
  suffix: "" | "%";
}

export interface ShareCardModel {
  template: ShareCardTemplate;
  format: ShareCardFormat;
  width: number;
  height: number;
  headline: string | null;
  metrics: ShareCardMetric[];
}

export type ShareCardEvidence = Pick<PlannerSnapshot, "tasks" | "habits" | "habitLogs" | "goals" | "milestones">;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const REFERRAL_CODE_PATTERN = /^ref_[a-f0-9]{32,64}$/;
export const DEFAULT_REFERRAL_SIGNUP_URL = "https://mybestversion.life/signup";

function withoutUnsafeTextCharacters(value: string) {
  return Array.from(value).filter((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return !(
      codePoint <= 31
      || (codePoint >= 127 && codePoint <= 159)
      || (codePoint >= 0x200b && codePoint <= 0x200f)
      || (codePoint >= 0x202a && codePoint <= 0x202e)
      || (codePoint >= 0x2060 && codePoint <= 0x206f)
      || codePoint === 0xfeff
    );
  }).join("");
}

function clampInteger(value: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function sanitizeShareCardHeadline(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = withoutUnsafeTextCharacters(value
    .normalize("NFKC")
    .replace(/\s+/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, 72).join("");
}

function sanitizeMetricKeys(metricKeys: readonly string[]): ShareCardMetricKey[] {
  const allowed = new Set<string>(SHARE_CARD_METRIC_KEYS);
  const unique = [...new Set(metricKeys.filter((key): key is ShareCardMetricKey => allowed.has(key)))];
  return (unique.length ? unique : [...DEFAULT_SHARE_CARD_METRICS]).slice(0, SHARE_CARD_METRIC_KEYS.length);
}

function progressValues(evidence: ShareCardEvidence, dateKeys?: readonly string[]) {
  const safeDateKeys = dateKeys?.filter((date) => DATE_KEY_PATTERN.test(date)).slice(0, 31);
  const includedDates = safeDateKeys?.length ? new Set(safeDateKeys) : null;
  const completedTasks = evidence.tasks.filter((task) => {
    if (task.status !== "completed") return false;
    const date = task.completedAt?.slice(0, 10) || task.date;
    return !includedDates || Boolean(date && includedDates.has(date));
  });
  const completedHabitLogs = evidence.habitLogs.filter((log) => (
    Number.isFinite(log.value)
    && log.value > 0
    && (!includedDates || includedDates.has(log.date))
  ));
  const intentionalDates = new Set<string>();

  for (const task of completedTasks) {
    const date = task.completedAt?.slice(0, 10) || task.date;
    if (date && DATE_KEY_PATTERN.test(date)) intentionalDates.add(date);
  }
  for (const log of completedHabitLogs) {
    if (DATE_KEY_PATTERN.test(log.date)) intentionalDates.add(log.date);
  }

  const activeGoals = evidence.goals.filter((goal) => goal.status === "active");
  const averageGoalProgress = activeGoals.length
    ? activeGoals.reduce((total, goal) => total + calculateGoalProgress(goal, evidence.milestones, evidence.tasks), 0) / activeGoals.length
    : 0;

  const scheduledHabitKeys = new Set<string>();
  if (includedDates) {
    for (const habit of evidence.habits.filter((item) => item.status === "active")) {
      for (const date of includedDates) {
        const scheduled = habit.oneOffDate
          ? habit.oneOffDate === date
          : habit.scheduledDays.includes(new Date(`${date}T12:00:00`).getDay());
        if (scheduled) scheduledHabitKeys.add(`${habit.id}:${date}`);
      }
    }
  }
  const completedScheduledOccurrences = new Set(completedHabitLogs
    .map((log) => `${log.habitId}:${log.date}`)
    .filter((occurrence) => scheduledHabitKeys.has(occurrence))).size;

  return {
    completed_tasks: clampInteger(completedTasks.length, 0),
    habit_checkins: clampInteger(completedHabitLogs.length, 0),
    habit_consistency: scheduledHabitKeys.size
      ? clampInteger((completedScheduledOccurrences / scheduledHabitKeys.size) * 100, 0, 100)
      : 0,
    intentional_days: clampInteger(intentionalDates.size, 0),
    goal_progress: clampInteger(averageGoalProgress, 0, 100),
  } satisfies Record<ShareCardMetricKey, number>;
}

export function buildShareCardModel(
  evidence: ShareCardEvidence,
  input: {
    format: ShareCardFormat;
    template?: ShareCardTemplate;
    headline?: string | null;
    metricKeys?: readonly string[];
    dateKeys?: readonly string[];
  },
): ShareCardModel {
  const format = input.format in SHARE_CARD_FORMATS ? input.format : "square";
  const template = SHARE_CARD_TEMPLATES.includes(input.template ?? "weekly") ? input.template ?? "weekly" : "weekly";
  const dimensions = SHARE_CARD_FORMATS[format];
  const values = progressValues(evidence, input.dateKeys);
  const metricKeys = sanitizeMetricKeys(input.metricKeys ?? DEFAULT_SHARE_CARD_METRICS);

  return {
    template,
    format,
    width: dimensions.width,
    height: dimensions.height,
    headline: sanitizeShareCardHeadline(input.headline),
    metrics: metricKeys.map((key) => ({
      key,
      value: values[key],
      suffix: key === "goal_progress" || key === "habit_consistency" ? "%" : "",
    })),
  };
}

function secureReferralBytes() {
  if (!globalThis.crypto?.getRandomValues) throw new Error("REFERRAL_RANDOM_UNAVAILABLE");
  return globalThis.crypto.getRandomValues(new Uint8Array(18));
}

export function createOpaqueReferralCode(randomBytes: () => Uint8Array = secureReferralBytes): string {
  const bytes = randomBytes();
  if (!(bytes instanceof Uint8Array) || bytes.length < 16 || bytes.length > 32) {
    throw new Error("INVALID_REFERRAL_RANDOM_BYTES");
  }
  return `ref_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function buildReferralLink(code: string, signupUrl = DEFAULT_REFERRAL_SIGNUP_URL): string {
  if (!REFERRAL_CODE_PATTERN.test(code)) throw new Error("INVALID_REFERRAL_CODE");
  const url = new URL(signupUrl);
  if (url.protocol !== "https:") throw new Error("INVALID_REFERRAL_URL");
  url.searchParams.set("ref", code);
  return url.toString();
}
