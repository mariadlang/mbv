import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "./planner";
import { buildDashboardSummary } from "./dashboardSummary";

describe("dashboard summary", () => {
  it("counts only scheduled habit days when calculating weekly consistency", () => {
    const snapshot = createEmptySnapshot();
    snapshot.habits = [{ id: "habit", name: "Moverme", type: "boolean", scheduledDays: [1, 3], target: 1, unit: "vez", status: "active", createdAt: "", updatedAt: "" }];
    snapshot.habitLogs = [
      { id: "monday", habitId: "habit", date: "2026-08-24", value: 1, createdAt: "", updatedAt: "" },
      { id: "tuesday", habitId: "habit", date: "2026-08-25", value: 1, createdAt: "", updatedAt: "" },
    ];

    const summary = buildDashboardSummary(snapshot, new Date("2026-08-28T12:00:00"));

    expect(summary.habitTotals).toEqual({ completed: 1, scheduled: 2 });
    expect(summary.habitConsistency).toBe(50);
  });

  it("uses existing goal progress and caps upcoming events at four", () => {
    const snapshot = createEmptySnapshot();
    snapshot.goals = [{ id: "goal", title: "Publicar", reason: "Importa", progressType: "manual", manualProgress: 64, priority: "high", status: "active", createdAt: "", updatedAt: "" }];
    snapshot.events = Array.from({ length: 6 }, (_, index) => ({ id: String(index), title: `Evento ${index}`, startDate: `2026-08-${29 + index}`, category: "personal" as const, createdAt: "", updatedAt: "" }));

    const summary = buildDashboardSummary(snapshot, new Date("2026-08-28T12:00:00"));

    expect(summary.averageGoalProgress).toBe(64);
    expect(summary.upcomingEvents).toHaveLength(4);
  });
});
