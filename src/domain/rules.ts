import { getDay } from "date-fns";
import type { Goal, Habit, HabitLog, Milestone, MoodName, Task } from "./planner";
import { toLocalDateKey } from "../lib/dates";

export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function calculateGoalProgress(
  goal: Goal,
  milestones: Milestone[],
  tasks: Task[],
): number {
  if (goal.progressType === "manual") {
    return clampProgress(goal.manualProgress ?? 0);
  }

  if (goal.progressType === "numeric") {
    if (!goal.targetValue || goal.targetValue <= 0) return 0;
    return clampProgress(((goal.currentValue ?? 0) / goal.targetValue) * 100);
  }

  if (goal.progressType === "tasks") {
    const linked = tasks.filter(
      (task) => task.goalId === goal.id && task.status !== "cancelled",
    );
    if (linked.length === 0) return 0;
    const completed = linked.filter((task) => task.status === "completed").length;
    return clampProgress((completed / linked.length) * 100);
  }

  const linkedMilestones = milestones.filter((milestone) => milestone.goalId === goal.id);
  const totalWeight = linkedMilestones.reduce((sum, milestone) => sum + milestone.weight, 0);
  if (totalWeight <= 0) return 0;
  const completedWeight = linkedMilestones
    .filter((milestone) => milestone.status === "completed")
    .reduce((sum, milestone) => sum + milestone.weight, 0);
  return clampProgress((completedWeight / totalWeight) * 100);
}

export function isHabitScheduledOn(habit: Habit, date: Date): boolean {
  if (habit.status !== "active") return false;
  if (habit.oneOffDate) return habit.oneOffDate === toLocalDateKey(date);
  return habit.scheduledDays.includes(getDay(date));
}

export function calculateHabitConsistency(
  habit: Habit,
  logs: HabitLog[],
  dates: Date[],
): { completed: number; scheduled: number; percentage: number } {
  const scheduledDates = dates.filter((date) => isHabitScheduledOn(habit, date));
  const scheduledKeys = new Set(scheduledDates.map(toLocalDateKey));
  const completed = new Set(
    logs
      .filter((log) => log.habitId === habit.id && log.value >= habit.target && scheduledKeys.has(log.date))
      .map((log) => log.date),
  ).size;
  const scheduled = scheduledDates.length;
  return {
    completed,
    scheduled,
    percentage: scheduled === 0 ? 0 : clampProgress((completed / scheduled) * 100),
  };
}

export function isHabitLogComplete(habit: Habit, log?: HabitLog): boolean {
  return Boolean(log && log.value >= habit.target);
}

export function calculateBestHabitStreak(habits: Habit[], logs: HabitLog[], dates: Date[]): number {
  return habits.reduce((bestAcrossHabits, habit) => {
    let current = 0;
    let best = 0;
    for (const date of dates) {
      if (!isHabitScheduledOn(habit, date)) continue;
      const dateKey = toLocalDateKey(date);
      const log = logs.find((item) => item.habitId === habit.id && item.date === dateKey);
      if (isHabitLogComplete(habit, log)) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    return Math.max(bestAcrossHabits, best);
  }, 0);
}

export function isTaskOverdue(task: Task, todayKey: string): boolean {
  return Boolean(
    task.date &&
      task.date < todayKey &&
      !["completed", "cancelled"].includes(task.status),
  );
}

const moodSummaryLabels: Record<MoodName, string> = {
  Abrumada: "Muy baja",
  Cansada: "Baja",
  Calmada: "Equilibrada",
  Enfocada: "Buena",
  Alegre: "Excelente",
};

export function buildTodayWellbeingSummary(intention: string, mood?: MoodName, energy?: number): string {
  return [intention.trim() || undefined, mood ? moodSummaryLabels[mood] : undefined, mood && energy ? `${energy}/10` : undefined]
    .filter(Boolean)
    .join(" · ");
}

export function getSafePlanningDates(currentWeek: Date[], nextWeek: Date[], todayKey: string): Date[] {
  const remaining = currentWeek.filter((date) => toLocalDateKey(date) >= todayKey);
  return remaining.length ? remaining : nextWeek.filter((date) => toLocalDateKey(date) >= todayKey);
}
