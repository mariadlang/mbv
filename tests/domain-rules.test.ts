import { describe, expect, it } from "vitest";
import { buildTodayWellbeingSummary, calculateBestHabitStreak, calculateGoalProgress, calculateHabitConsistency, clampProgress, getSafePlanningDates, isHabitScheduledOn, isTaskOverdue } from "@/src/domain/rules";
import type { Goal, Habit, HabitLog, Milestone, Task } from "@/src/domain/planner";
import { goalFormSchema } from "@/src/lib/schemas";
import { calculateChallengeProgress, challengeEncouragement } from "@/src/domain/challengeRules";
import { getInclusiveDateCount, isDateKeyWithinRange, toLocalDateKey } from "@/src/lib/dates";

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

  it("accepts a target date or target month but never both", () => {
    const base = { title: "Completar 21K", reason: "Cuidar mi salud", priority: "medium" as const };
    expect(goalFormSchema.safeParse({ ...base, targetDate: "2026-10-01" }).success).toBe(true);
    expect(goalFormSchema.safeParse({ ...base, targetMonth: "2026-10" }).success).toBe(true);
    expect(goalFormSchema.safeParse({ ...base, targetDate: "2026-10-01", targetMonth: "2026-10" }).success).toBe(false);
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

  it("schedules a one-off habit only on its selected date", () => {
    const habit: Habit = {
      id: "habit-once", name: "Jugar tenis", type: "boolean", scheduledDays: [], oneOffDate: "2026-08-12",
      target: 1, unit: "sesión", status: "active", createdAt: now, updatedAt: now,
    };
    expect(isHabitScheduledOn(habit, new Date("2026-08-12T12:00:00"))).toBe(true);
    expect(isHabitScheduledOn(habit, new Date("2026-08-13T12:00:00"))).toBe(false);
  });

  it("only counts quantity goals as complete when their target is reached", () => {
    const habit: Habit = { id: "water", name: "Beber agua", type: "quantity", scheduledDays: [1], target: 8, unit: "vasos", status: "active", createdAt: now, updatedAt: now };
    const dates = [new Date("2026-08-10T12:00:00")];
    const partial: HabitLog = { id: "partial", habitId: habit.id, date: "2026-08-10", value: 5, createdAt: now, updatedAt: now };
    expect(calculateHabitConsistency(habit, [partial], dates)).toEqual({ completed: 0, scheduled: 1, percentage: 0 });
    expect(calculateHabitConsistency(habit, [{ ...partial, value: 8 }], dates)).toEqual({ completed: 1, scheduled: 1, percentage: 100 });
  });

  it("calculates streaks only across scheduled occurrences", () => {
    const habit: Habit = { id: "training", name: "Entrenar", type: "boolean", scheduledDays: [1, 3, 5], target: 1, unit: "sesión", status: "active", createdAt: now, updatedAt: now };
    const dates = [10, 11, 12, 13, 14].map((day) => new Date(`2026-08-${day}T12:00:00`));
    const logs: HabitLog[] = [10, 12, 14].map((day) => ({ id: `log-${day}`, habitId: habit.id, date: `2026-08-${day}`, value: 1, createdAt: now, updatedAt: now }));
    expect(calculateBestHabitStreak([habit], logs, dates)).toBe(3);
  });
});

describe("task rules", () => {
  it("keeps an unfinished dated task visible as overdue", () => {
    const task: Task = { id: "t1", title: "Transferir ahorro", date: "2026-08-09", priority: "medium", status: "planned", createdAt: now, updatedAt: now };
    expect(isTaskOverdue(task, "2026-08-10")).toBe(true);
    expect(isTaskOverdue({ ...task, status: "completed" }, "2026-08-10")).toBe(false);
  });
});

describe("challenge rules", () => {
  it("counts unique registered days and caps finite progress", () => {
    expect(calculateChallengeProgress({ completedDates: ["2026-08-10", "2026-08-10", "2026-08-11"] }, 1))
      .toEqual({ completed: 2, planned: 1, percentage: 100 });
    expect(calculateChallengeProgress({ completedDates: ["2026-08-10"] }))
      .toEqual({ completed: 1 });
  });

  it("handles inclusive local date ranges without penalizing days outside them", () => {
    expect(getInclusiveDateCount("2026-08-10", "2026-08-12")).toBe(3);
    expect(isDateKeyWithinRange("2026-08-09", "2026-08-10", "2026-08-12")).toBe(false);
    expect(isDateKeyWithinRange("2026-08-12", "2026-08-10", "2026-08-12")).toBe(true);
    expect(challengeEncouragement(2, false)).toMatch(/retomarlo/);
  });
});

describe("daily and weekly presentation rules", () => {
  it("builds wellbeing summaries without repeated or undefined fragments", () => {
    expect(buildTodayWellbeingSummary("", undefined, undefined)).toBe("");
    expect(buildTodayWellbeingSummary("Respirar", undefined, undefined)).toBe("Respirar");
    expect(buildTodayWellbeingSummary("", "Enfocada", 8)).toBe("Buena · 8/10");
    expect(buildTodayWellbeingSummary("Respirar", "Alegre", 9)).toBe("Respirar · Excelente · 9/10");
  });

  it("never suggests a planning date before today", () => {
    const current = [new Date("2026-08-31T12:00:00"), new Date("2026-09-01T12:00:00"), new Date("2026-09-02T12:00:00")];
    const next = [new Date("2026-09-07T12:00:00"), new Date("2026-09-08T12:00:00")];
    expect(getSafePlanningDates(current, next, "2026-09-02").map(toLocalDateKey)).toEqual(["2026-09-02"]);
    expect(getSafePlanningDates(current, next, "2026-09-05").map(toLocalDateKey)).toEqual(["2026-09-07", "2026-09-08"]);
  });
});
