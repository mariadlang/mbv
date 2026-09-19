import { getRecentDates, toLocalDateKey } from "@/src/lib/dates";
import type { PlannerSnapshot } from "@/src/domain/planner";

export type PremiumRecommendationId =
  | "complete_profile"
  | "create_goal"
  | "connect_next_action"
  | "build_rhythm"
  | "review_low_area"
  | "protect_focus";

export interface PremiumProgressAnalysis {
  windowDays: number;
  activeDays: number;
  completedTasks: number;
  scheduledTasks: number;
  taskCompletionRate: number | null;
  habitEntries: number;
  strongestWeekday: number | null;
  hasEnoughEvidence: boolean;
}

export interface PremiumRecommendation {
  id: PremiumRecommendationId;
  lifeAreaName?: string;
}

const WINDOW_DAYS = 30;
const MINIMUM_PATTERN_DAYS = 3;

function weekdayFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function buildPremiumProgressAnalysis(
  snapshot: PlannerSnapshot,
  endDate = new Date(),
): PremiumProgressAnalysis {
  const dateKeys = getRecentDates(WINDOW_DAYS, endDate).map(toLocalDateKey);
  const windowKeys = new Set(dateKeys);
  const completedTasks = snapshot.tasks.filter(
    (task) => task.date && windowKeys.has(task.date) && task.status === "completed",
  );
  const scheduledTasks = snapshot.tasks.filter(
    (task) => task.date && windowKeys.has(task.date) && task.status !== "cancelled",
  );
  const habitEntries = snapshot.habitLogs.filter(
    (log) => windowKeys.has(log.date) && log.value > 0,
  );
  const activeDateKeys = new Set([
    ...completedTasks.map((task) => task.date).filter((date): date is string => Boolean(date)),
    ...habitEntries.map((log) => log.date),
  ]);
  const weekdayCounts = new Map<number, number>();
  activeDateKeys.forEach((dateKey) => {
    const weekday = weekdayFromDateKey(dateKey);
    weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
  });
  const strongestWeekday = activeDateKeys.size >= MINIMUM_PATTERN_DAYS
    ? [...weekdayCounts.entries()].sort(([leftDay, leftCount], [rightDay, rightCount]) =>
      rightCount - leftCount || leftDay - rightDay,
    )[0]?.[0] ?? null
    : null;

  return {
    windowDays: WINDOW_DAYS,
    activeDays: activeDateKeys.size,
    completedTasks: completedTasks.length,
    scheduledTasks: scheduledTasks.length,
    taskCompletionRate: scheduledTasks.length
      ? Math.round((completedTasks.length / scheduledTasks.length) * 100)
      : null,
    habitEntries: habitEntries.length,
    strongestWeekday,
    hasEnoughEvidence: activeDateKeys.size >= MINIMUM_PATTERN_DAYS,
  };
}

export function buildPremiumRecommendation(
  snapshot: PlannerSnapshot,
  analysis: PremiumProgressAnalysis,
): PremiumRecommendation {
  const profileContext = [snapshot.profile?.intention, snapshot.profile?.usePurpose]
    .some((value) => Boolean(value?.trim()));
  if (!profileContext) return { id: "complete_profile" };

  const activeGoals = snapshot.goals.filter((goal) => goal.status === "active");
  if (!activeGoals.length) return { id: "create_goal" };

  const hasOpenGoalAction = snapshot.tasks.some(
    (task) => task.goalId && task.status !== "completed" && task.status !== "cancelled",
  );
  if (!hasOpenGoalAction) return { id: "connect_next_action" };

  if (!analysis.hasEnoughEvidence) return { id: "build_rhythm" };

  const lowestArea = snapshot.lifeAreas
    .filter((area) => area.active && typeof area.currentScore === "number")
    .sort((left, right) => (left.currentScore ?? 10) - (right.currentScore ?? 10))[0];
  if (lowestArea && (lowestArea.currentScore ?? 10) <= 5) {
    return { id: "review_low_area", lifeAreaName: lowestArea.name };
  }

  return { id: "protect_focus" };
}
