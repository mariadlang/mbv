import type { PlannerSnapshot } from "./planner";
import { isHabitLogComplete, isHabitScheduledOn } from "./rules";
import { toLocalDateKey } from "../lib/dates";

export interface WeeklyRecapSummary {
  reviewable: boolean;
  reviewedDays: number;
  tasks: {
    scheduled: number;
    completed: number;
    open: number;
  };
  priorities: {
    scheduled: number;
    completed: number;
  };
  habits: {
    scheduled: number;
    completed: number;
  };
  goals: {
    connected: number;
    advanced: number;
  };
  milestones: {
    completed: number;
  };
  rescheduledTasks: number;
  hasEvidence: boolean;
}

export function buildWeeklyRecap(
  snapshot: PlannerSnapshot,
  weekDates: Date[],
  throughDateKey = toLocalDateKey(weekDates[weekDates.length - 1] ?? new Date()),
): WeeklyRecapSummary {
  const firstWeekKey = toLocalDateKey(weekDates[0] ?? new Date());
  const eligibleDates = weekDates.filter((date) => toLocalDateKey(date) <= throughDateKey);
  const weekKeys = new Set(eligibleDates.map(toLocalDateKey));
  const tasks = snapshot.tasks.filter((task) => task.date && weekKeys.has(task.date) && task.status !== "cancelled");
  const priorities = tasks.filter((task) => task.priority === "high" || Boolean(task.focusPriority));
  const habitsById = new Map(snapshot.habits.map((habit) => [habit.id, habit]));
  const completedHabitOccurrences = new Set(snapshot.habitLogs.flatMap((log) => {
    const habit = habitsById.get(log.habitId);
    return habit && weekKeys.has(log.date) && isHabitLogComplete(habit, log) ? [`${habit.id}:${log.date}`] : [];
  }));

  let scheduledHabits = 0;
  let completedHabits = 0;
  for (const date of eligibleDates) {
    const dateKey = toLocalDateKey(date);
    for (const habit of snapshot.habits) {
      if (!isHabitScheduledOn(habit, date)) continue;
      scheduledHabits += 1;
      if (completedHabitOccurrences.has(`${habit.id}:${dateKey}`)) completedHabits += 1;
    }
  }

  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const completedPriorities = priorities.filter((task) => task.status === "completed").length;
  const connectedGoalIds = new Set(tasks.flatMap((task) => task.goalId ? [task.goalId] : []));
  const advancedGoalIds = new Set(tasks.flatMap((task) => task.status === "completed" && task.goalId ? [task.goalId] : []));
  const completedMilestones = snapshot.milestones.filter((milestone) => milestone.status === "completed" && weekKeys.has(milestone.updatedAt.slice(0, 10)));
  completedMilestones.forEach((milestone) => {
    connectedGoalIds.add(milestone.goalId);
    advancedGoalIds.add(milestone.goalId);
  });
  const rescheduledTasks = tasks.filter((task) => (task.rescheduleCount ?? 0) > 0).length;
  return {
    reviewable: firstWeekKey <= throughDateKey,
    reviewedDays: eligibleDates.length,
    tasks: {
      scheduled: tasks.length,
      completed: completedTasks,
      open: tasks.length - completedTasks,
    },
    priorities: {
      scheduled: priorities.length,
      completed: completedPriorities,
    },
    habits: {
      scheduled: scheduledHabits,
      completed: completedHabits,
    },
    goals: {
      connected: connectedGoalIds.size,
      advanced: advancedGoalIds.size,
    },
    milestones: {
      completed: completedMilestones.length,
    },
    rescheduledTasks,
    hasEvidence: tasks.length > 0 || scheduledHabits > 0 || completedMilestones.length > 0,
  };
}
