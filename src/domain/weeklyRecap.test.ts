import { describe, expect, it } from "vitest";
import { createEmptySnapshot, type Habit, type Task } from "./planner";
import { buildWeeklyRecap } from "./weeklyRecap";

const timestamp = "2026-09-14T12:00:00.000Z";
const weekDates = Array.from({ length: 7 }, (_, index) => new Date(2026, 8, 14 + index, 12));

function task(input: Partial<Task> & Pick<Task, "id" | "date" | "status">): Task {
  return {
    title: input.id,
    priority: "medium",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
}

function habit(input: Partial<Habit> & Pick<Habit, "id">): Habit {
  return {
    name: input.id,
    type: "boolean",
    scheduledDays: [0, 1, 2, 3, 4, 5, 6],
    target: 1,
    unit: "vez",
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
}

describe("buildWeeklyRecap", () => {
  it("summarizes only real tasks, priorities and scheduled habit occurrences from the week", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [
      task({ id: "done", date: "2026-09-14", status: "completed", priority: "high" }),
      task({ id: "open", date: "2026-09-15", status: "planned", focusPriority: 1 }),
      task({ id: "cancelled", date: "2026-09-16", status: "cancelled", priority: "high" }),
      task({ id: "outside", date: "2026-09-21", status: "completed" }),
    ];
    snapshot.habits = [
      habit({ id: "daily" }),
      habit({ id: "one-off", oneOffDate: "2026-09-16", scheduledDays: [] }),
      habit({ id: "paused", status: "paused" }),
    ];
    snapshot.habitLogs = [
      { id: "daily-done", habitId: "daily", date: "2026-09-14", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "daily-open", habitId: "daily", date: "2026-09-15", value: 0, createdAt: timestamp, updatedAt: timestamp },
      { id: "one-off-done", habitId: "one-off", date: "2026-09-16", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "outside-log", habitId: "daily", date: "2026-09-21", value: 1, createdAt: timestamp, updatedAt: timestamp },
    ];
    snapshot.goals = [{ id: "goal", title: "Meta", reason: "Importa", progressType: "milestones", priority: "high", status: "active", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.milestones = [{ id: "milestone", goalId: "goal", title: "Hito", weight: 100, status: "completed", createdAt: timestamp, updatedAt: "2026-09-16T12:00:00.000Z" }];
    snapshot.tasks[0].goalId = "goal";
    snapshot.tasks[1].rescheduleCount = 1;

    expect(buildWeeklyRecap(snapshot, weekDates)).toEqual({
      reviewable: true,
      reviewedDays: 7,
      tasks: { scheduled: 2, completed: 1, open: 1 },
      priorities: { scheduled: 2, completed: 1 },
      habits: { scheduled: 8, completed: 2 },
      goals: { connected: 1, advanced: 1 },
      milestones: { completed: 1 },
      rescheduledTasks: 1,
      hasEvidence: true,
    });
  });

  it("does not count future days when reviewing the current week", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [
      task({ id: "today", date: "2026-09-16", status: "completed" }),
      task({ id: "future", date: "2026-09-18", status: "completed" }),
    ];
    snapshot.habits = [habit({ id: "daily" })];
    snapshot.habitLogs = [
      { id: "today-log", habitId: "daily", date: "2026-09-16", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "future-log", habitId: "daily", date: "2026-09-18", value: 1, createdAt: timestamp, updatedAt: timestamp },
    ];

    expect(buildWeeklyRecap(snapshot, weekDates, "2026-09-16")).toMatchObject({
      reviewable: true,
      reviewedDays: 3,
      tasks: { scheduled: 1, completed: 1, open: 0 },
      habits: { scheduled: 3, completed: 1 },
    });
  });

  it("marks a future week as unavailable for review", () => {
    expect(buildWeeklyRecap(createEmptySnapshot(), weekDates, "2026-09-10")).toMatchObject({
      reviewable: false,
      reviewedDays: 0,
      hasEvidence: false,
    });
  });

  it("returns an explicit empty state instead of inventing progress", () => {
    expect(buildWeeklyRecap(createEmptySnapshot(), weekDates)).toEqual({
      reviewable: true,
      reviewedDays: 7,
      tasks: { scheduled: 0, completed: 0, open: 0 },
      priorities: { scheduled: 0, completed: 0 },
      habits: { scheduled: 0, completed: 0 },
      goals: { connected: 0, advanced: 0 },
      milestones: { completed: 0 },
      rescheduledTasks: 0,
      hasEvidence: false,
    });
  });
});
