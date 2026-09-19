import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "./planner";
import { buildPremiumProgressAnalysis, buildPremiumRecommendation } from "./premiumInsights";

const now = new Date(2026, 8, 19, 12, 0, 0);
const timestamp = "2026-09-19T17:00:00.000Z";

describe("premium progress analysis", () => {
  it("shows an honest empty result when there is no evidence", () => {
    const analysis = buildPremiumProgressAnalysis(createEmptySnapshot(), now);

    expect(analysis).toMatchObject({
      activeDays: 0,
      completedTasks: 0,
      scheduledTasks: 0,
      taskCompletionRate: null,
      habitEntries: 0,
      strongestWeekday: null,
      hasEnoughEvidence: false,
    });
  });

  it("uses only the last 30 days and counts each active date once", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [
      { id: "today", title: "Acción", date: "2026-09-19", priority: "medium", status: "completed", createdAt: timestamp, updatedAt: timestamp },
      { id: "pending", title: "Pendiente", date: "2026-09-18", priority: "medium", status: "planned", createdAt: timestamp, updatedAt: timestamp },
      { id: "old", title: "Antigua", date: "2026-08-01", priority: "medium", status: "completed", createdAt: timestamp, updatedAt: timestamp },
    ];
    snapshot.habitLogs = [
      { id: "same-day", habitId: "habit", date: "2026-09-19", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "another-day", habitId: "habit", date: "2026-09-17", value: 1, createdAt: timestamp, updatedAt: timestamp },
    ];

    expect(buildPremiumProgressAnalysis(snapshot, now)).toMatchObject({
      activeDays: 2,
      completedTasks: 1,
      scheduledTasks: 2,
      taskCompletionRate: 50,
      habitEntries: 2,
      hasEnoughEvidence: false,
    });
  });

  it("does not claim a weekday pattern before three active dates", () => {
    const snapshot = createEmptySnapshot();
    snapshot.habitLogs = ["2026-09-01", "2026-09-08", "2026-09-15"].map((date, index) => ({
      id: String(index), habitId: "habit", date, value: 1, createdAt: timestamp, updatedAt: timestamp,
    }));

    const analysis = buildPremiumProgressAnalysis(snapshot, now);
    expect(analysis.hasEnoughEvidence).toBe(true);
    expect(analysis.strongestWeekday).toBe(2);
  });
});

describe("premium recommendations", () => {
  it("asks for context instead of inventing a personalized recommendation", () => {
    const snapshot = createEmptySnapshot();
    const analysis = buildPremiumProgressAnalysis(snapshot, now);

    expect(buildPremiumRecommendation(snapshot, analysis)).toEqual({ id: "complete_profile" });
  });

  it("uses profile, goals and area evidence in a deterministic order", () => {
    const snapshot = createEmptySnapshot();
    snapshot.profile = {
      id: "profile", name: "María", intention: "Vivir con intención", dailyIntention: "Avanzar", startDate: "2026-09-01", weekStartsOn: 1,
      priorityAreaIds: [], onboardingCompleted: true, createdAt: timestamp, updatedAt: timestamp,
    };
    snapshot.goals = [{ id: "goal", title: "Cuidar mi salud", reason: "Bienestar", progressType: "tasks", priority: "high", status: "active", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.tasks = [{ id: "task", title: "Caminar", goalId: "goal", date: "2026-09-19", priority: "medium", status: "planned", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.lifeAreas = [{ id: "health", name: "Salud", color: "sage", order: 0, active: true, currentScore: 4, createdAt: timestamp, updatedAt: timestamp }];
    const analysis = { ...buildPremiumProgressAnalysis(snapshot, now), hasEnoughEvidence: true };

    expect(buildPremiumRecommendation(snapshot, analysis)).toEqual({ id: "review_low_area", lifeAreaName: "Salud" });
  });
});
