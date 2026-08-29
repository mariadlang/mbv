import type { PlannerSnapshot } from "./planner";
import { calculateGoalProgress, calculateHabitConsistency } from "./rules";
import { getReviewPeriodKey, getWeekDates, toLocalDateKey } from "../lib/dates";

export function buildDashboardSummary(snapshot: PlannerSnapshot, today = new Date()) {
  const todayKey = toLocalDateKey(today);
  const weekDates = getWeekDates(today, snapshot.profile?.weekStartsOn ?? 1);
  const weekKeys = new Set(weekDates.map(toLocalDateKey));
  const activeGoals = snapshot.goals.filter((goal) => goal.status === "active");
  const goalProgress = activeGoals.map((goal) => calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks));
  const averageGoalProgress = goalProgress.length ? Math.round(goalProgress.reduce((sum, value) => sum + value, 0) / goalProgress.length) : 0;
  const activeHabits = snapshot.habits.filter((habit) => habit.status === "active");
  const habitTotals = activeHabits.reduce((totals, habit) => {
    const result = calculateHabitConsistency(habit, snapshot.habitLogs, weekDates);
    return { completed: totals.completed + result.completed, scheduled: totals.scheduled + result.scheduled };
  }, { completed: 0, scheduled: 0 });
  const habitConsistency = habitTotals.scheduled ? Math.round(habitTotals.completed / habitTotals.scheduled * 100) : 0;
  const wellbeingLogs = snapshot.moodLogs.filter((log) => weekKeys.has(log.date));
  const wellbeing = wellbeingLogs.length ? Number((wellbeingLogs.reduce((sum, log) => sum + log.energy, 0) / wellbeingLogs.length).toFixed(1)) : null;
  const weekTasks = snapshot.tasks.filter((task) => task.date && weekKeys.has(task.date) && task.status !== "cancelled");
  const completedWeekTasks = weekTasks.filter((task) => task.status === "completed").length;
  const weekKey = getReviewPeriodKey("weekly", today, snapshot.profile?.weekStartsOn ?? 1);
  const weeklyPlan = snapshot.cascadePlans.find((plan) => plan.horizon === "weekly" && plan.periodKey === weekKey)
    ?? snapshot.cascadePlans.filter((plan) => plan.horizon === "weekly").sort((a, b) => b.periodKey.localeCompare(a.periodKey))[0];
  const primaryGoal = activeGoals[0];
  const nextMilestone = primaryGoal
    ? snapshot.milestones.find((milestone) => milestone.goalId === primaryGoal.id && milestone.status !== "completed")
    : undefined;
  const upcomingEvents = snapshot.events
    .filter((event) => event.startDate >= todayKey)
    .sort((a, b) => `${a.startDate}${a.time ?? ""}`.localeCompare(`${b.startDate}${b.time ?? ""}`))
    .slice(0, 4);

  return {
    activeGoals,
    averageGoalProgress,
    habitConsistency,
    habitTotals,
    wellbeing,
    weekTasks: { completed: completedWeekTasks, total: weekTasks.length, percentage: weekTasks.length ? Math.round(completedWeekTasks / weekTasks.length * 100) : 0 },
    weeklyPlan,
    primaryGoal,
    nextMilestone,
    upcomingEvents,
    lifeAreas: snapshot.lifeAreas.filter((area) => area.active),
  };
}
