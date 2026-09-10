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

  it("activates connected and three-day achievements only with sufficient data", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{ id: "task", title: "Correr 5 km", goalId: "goal", projectId: "project", priority: "high", status: "completed", date: "2026-09-01", completedAt: "2026-09-01T12:00:00.000Z", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.habitLogs = [
      { id: "one", habitId: "habit", date: "2026-09-02", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "two", habitId: "habit", date: "2026-09-03", value: 1, createdAt: timestamp, updatedAt: timestamp },
    ];
    const evidence = buildProgressEvidence(snapshot);
    expect(evidence.achievements.map((item) => item.id)).toEqual(["first-task", "first-habit", "connected-action", "intentional-week"]);
  });

  it("dates the three-day achievement when every required kind of evidence is present", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [1, 2, 3].map((day) => ({
      id: `task-${day}`,
      title: `Acción ${day}`,
      priority: "medium" as const,
      status: "completed" as const,
      date: `2026-09-0${day}`,
      completedAt: `2026-09-0${day}T12:00:00.000Z`,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    snapshot.habitLogs = [{ id: "later-habit", habitId: "habit", date: "2026-10-10", value: 1, createdAt: timestamp, updatedAt: timestamp }];

    const evidence = buildProgressEvidence(snapshot);
    const threeDays = evidence.achievements.find((item) => item.id === "intentional-week");

    expect(threeDays?.title).toBe("Tres días con intención");
    expect(threeDays?.description).toMatch(/sin exigir que sean consecutivos/);
    expect(threeDays?.achievedAt).toBe("2026-10-10");
    expect(evidence.latestAchievement?.id).toBe("intentional-week");
  });

  it("selects the most recently reached achievement by evidence date", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [
      { id: "old-task", title: "Preparar borrador", priority: "medium", status: "completed", date: "2026-09-01", completedAt: "2026-09-01T12:00:00.000Z", createdAt: timestamp, updatedAt: timestamp },
      { id: "recent-connected", title: "Publicar resultado", goalId: "goal", projectId: "project", priority: "high", status: "completed", date: "2026-09-10", completedAt: "2026-09-10T12:00:00.000Z", createdAt: timestamp, updatedAt: "2026-09-10T12:00:00.000Z" },
    ];
    snapshot.habitLogs = [
      { id: "one", habitId: "habit", date: "2026-09-02", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "two", habitId: "habit", date: "2026-09-03", value: 1, createdAt: timestamp, updatedAt: timestamp },
    ];

    const evidence = buildProgressEvidence(snapshot);

    expect(evidence.latestAchievement?.id).toBe("connected-action");
    expect(evidence.latestAchievement?.achievedAt).toBe("2026-09-10T12:00:00.000Z");
  });
});
