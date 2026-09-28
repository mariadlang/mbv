import { describe, expect, it } from "vitest";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerRepository } from "@/src/repositories/interfaces/PlannerRepository";
import { createPlannerService } from "./plannerService";

class MemoryPlannerRepository implements PlannerRepository {
  constructor(public snapshot: PlannerSnapshot) {}
  async load() { return structuredClone(this.snapshot); }
  async replace(snapshot: PlannerSnapshot) { this.snapshot = structuredClone(snapshot); }
  async clear() { this.snapshot = createEmptySnapshot(); }
  close() {}
}

describe("plannerService.upsertPlanActions", () => {
  it("is idempotent for concurrent retries that share the same stable action key", async () => {
    const repository = new MemoryPlannerRepository(createEmptySnapshot());
    const service = createPlannerService(repository);
    const action = { actionKey: "month-action-1", title: "Preparar propuesta", date: "2026-10-08" };

    await Promise.all([
      service.upsertPlanActions("month-2026-10", "goal-1", [action]),
      service.upsertPlanActions("month-2026-10", "goal-1", [action]),
    ]);

    const saved = await service.load();
    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0]).toMatchObject({
      title: "Preparar propuesta",
      periodPlanId: "month-2026-10",
      planActionKey: "month-action-1",
      goalId: "goal-1",
      date: "2026-10-08",
    });
  });

  it("keeps equal titles as separate actions when their stable keys differ", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(createEmptySnapshot()));

    const saved = await service.upsertPlanActions("month-2026-10", undefined, [
      { actionKey: "morning", title: "Revisar agenda" },
      { actionKey: "afternoon", title: "Revisar agenda" },
    ]);

    expect(saved.tasks).toHaveLength(2);
    expect(saved.tasks.map((task) => task.planActionKey)).toEqual(["morning", "afternoon"]);
    expect(new Set(saved.tasks.map((task) => task.id).filter(Boolean)).size).toBe(2);
  });

  it("reuses the stable key when a retry carries a stale task id", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(createEmptySnapshot()));
    await service.upsertPlanActions("month-2026-10", undefined, [
      { actionKey: "month-action-1", title: "Preparar propuesta" },
    ]);

    const saved = await service.upsertPlanActions("month-2026-10", undefined, [
      { taskId: "stale-task-id", actionKey: "month-action-1", title: "Preparar propuesta final" },
    ]);

    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0]).toMatchObject({
      title: "Preparar propuesta final",
      planActionKey: "month-action-1",
    });
  });

  it("backfills the stable key while preserving a legacy task identity", async () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{
      id: "legacy-task",
      title: "Preparar propuesta",
      periodPlanId: "month-2026-10",
      priority: "medium",
      status: "inbox",
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-01T12:00:00.000Z",
    }];
    const service = createPlannerService(new MemoryPlannerRepository(snapshot));

    const saved = await service.upsertPlanActions("month-2026-10", undefined, [
      { taskId: "legacy-task", actionKey: "month-action-1", title: "Preparar propuesta final" },
    ]);

    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0]).toMatchObject({
      id: "legacy-task",
      title: "Preparar propuesta final",
      planActionKey: "month-action-1",
    });
  });

  it("does not move a legacy task from another plan when a stale task id is submitted", async () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{
      id: "other-plan-task",
      title: "Acción de noviembre",
      periodPlanId: "month-2026-11",
      priority: "medium",
      status: "inbox",
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-01T12:00:00.000Z",
    }];
    const service = createPlannerService(new MemoryPlannerRepository(snapshot));

    const saved = await service.upsertPlanActions("month-2026-10", undefined, [
      { taskId: "other-plan-task", actionKey: "october-action", title: "Acción de octubre" },
    ]);

    expect(saved.tasks).toHaveLength(2);
    expect(saved.tasks.find((task) => task.id === "other-plan-task")).toMatchObject({
      title: "Acción de noviembre",
      periodPlanId: "month-2026-11",
    });
    expect(saved.tasks.find((task) => task.id === "other-plan-task")?.planActionKey).toBeUndefined();
    expect(saved.tasks.find((task) => task.planActionKey === "october-action")).toMatchObject({
      title: "Acción de octubre",
      periodPlanId: "month-2026-10",
    });
  });

  it("does not overwrite an existing action relationship when the month links another goal", async () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{
      id: "linked-task",
      title: "Preparar propuesta",
      goalId: "original-goal",
      periodPlanId: "month-2026-10",
      priority: "medium",
      status: "inbox",
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-01T12:00:00.000Z",
    }];
    const service = createPlannerService(new MemoryPlannerRepository(snapshot));

    const saved = await service.upsertPlanActions("month-2026-10", "new-month-goal", [
      { taskId: "linked-task", actionKey: "month-action-1", title: "Preparar propuesta final" },
      { actionKey: "new-action", title: "Compartir propuesta" },
    ]);

    expect(saved.tasks.find((task) => task.id === "linked-task")?.goalId).toBe("original-goal");
    expect(saved.tasks.find((task) => task.planActionKey === "new-action")?.goalId).toBe("new-month-goal");
  });

  it("scopes the same stable action key to its monthly plan", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(createEmptySnapshot()));
    await service.upsertPlanActions("month-2026-10", undefined, [
      { actionKey: "first-action", title: "Preparar propuesta" },
    ]);

    const saved = await service.upsertPlanActions("month-2026-11", undefined, [
      { actionKey: "first-action", title: "Preparar propuesta" },
    ]);

    expect(saved.tasks).toHaveLength(2);
    expect(saved.tasks.map((task) => task.periodPlanId)).toEqual(["month-2026-10", "month-2026-11"]);
  });
});
