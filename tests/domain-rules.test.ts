import { describe, expect, it } from "vitest";
import { calculateGoalProgress, calculateHabitConsistency, clampProgress, isTaskOverdue } from "@/src/domain/rules";
import type { Goal, Habit, HabitLog, Milestone, Task } from "@/src/domain/planner";

const now = "2026-08-10T12:00:00.000Z";
const goal: Goal = {
  id: "goal-1",
  title: "Completar 21K",
  reason: "Bienestar",
  progressType: "milestones",
  priority: "high",
  status: "active",
  createdAt: now,
  updatedAt: now,
};

describe("goal progress", () => {
  it("calculates weighted milestone progress", () => {
    const milestones: Milestone[] = [
      { id: "m1", goalId: goal.id, title: "10K", weight: 30, status: "completed", createdAt: now, updatedAt: now },
      { id: "m2", goalId: goal.id, title: "15K", weight: 70, status: "active", createdAt: now, updatedAt: now },
    ];
    expect(calculateGoalProgress(goal, milestones, [])).toBe(30);
  });

  it("clamps manual and numeric progress between zero and one hundred", () => {
    expect(clampProgress(-20)).toBe(0);
    expect(clampProgress(140)).toBe(100);
    expect(calculateGoalProgress({ ...goal, progressType: "numeric", currentValue: 15, targetValue: 10 }, [], [])).toBe(100);
  });
});

describe("habit consistency", () => {
  it("does not penalize non-scheduled days", () => {
    const habit: Habit = {
      id: "habit-1",
      name: "Entrenamiento",
      type: "boolean",
      scheduledDays: [1, 3, 5],
      target: 1,
      unit: "sesión",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    const dates = [new Date("2026-08-10T12:00:00"), new Date("2026-08-11T12:00:00"), new Date("2026-08-12T12:00:00")];
    const logs: HabitLog[] = [{ id: "log-1", habitId: habit.id, date: "2026-08-10", value: 1, createdAt: now, updatedAt: now }];
    expect(calculateHabitConsistency(habit, logs, dates)).toEqual({ completed: 1, scheduled: 2, percentage: 50 });
  });
});

describe("task rules", () => {
  it("keeps an unfinished dated task visible as overdue", () => {
    const task: Task = { id: "t1", title: "Transferir ahorro", date: "2026-08-09", priority: "medium", status: "planned", createdAt: now, updatedAt: now };
    expect(isTaskOverdue(task, "2026-08-10")).toBe(true);
    expect(isTaskOverdue({ ...task, status: "completed" }, "2026-08-10")).toBe(false);
  });
});
