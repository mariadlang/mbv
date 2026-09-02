import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "./planner";
import { buildProgressEvidence } from "./progressEvidence";

const timestamp = "2026-09-02T12:00:00.000Z";

describe("progress evidence", () => {
  it("does not invent achievements when there is no activity", () => {
    const evidence = buildProgressEvidence(createEmptySnapshot());
    expect(evidence.achievements).toEqual([]);
    expect(evidence.latestAchievement).toBeUndefined();
  });

  it("shows only the evidence supported by partial data", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{ id: "task", title: "Enviar propuesta", priority: "medium", status: "completed", date: "2026-09-01", completedAt: timestamp, createdAt: timestamp, updatedAt: timestamp }];
    const evidence = buildProgressEvidence(snapshot);
    expect(evidence.achievements.map((item) => item.id)).toEqual(["first-task"]);
  });

  it("activates connected and weekly achievements only with sufficient data", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{ id: "task", title: "Correr 5 km", goalId: "goal", projectId: "project", priority: "high", status: "completed", date: "2026-09-01", completedAt: "2026-09-01T12:00:00.000Z", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.habitLogs = [
      { id: "one", habitId: "habit", date: "2026-09-02", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "two", habitId: "habit", date: "2026-09-03", value: 1, createdAt: timestamp, updatedAt: timestamp },
    ];
    const evidence = buildProgressEvidence(snapshot);
    expect(evidence.achievements.map((item) => item.id)).toEqual(["first-task", "first-habit", "connected-action", "intentional-week"]);
  });
});
