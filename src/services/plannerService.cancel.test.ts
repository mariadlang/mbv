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

describe("plannerService.cancelTask", () => {
  it("keeps the task and its context while marking it as canceled", async () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{
      id: "pending",
      title: "Acción pendiente",
      description: "Contexto que no debe perderse",
      date: "2026-09-12",
      goalId: "goal",
      focusPriority: 1,
      priority: "high",
      status: "planned",
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-01T12:00:00.000Z",
    }];
    const service = createPlannerService(new MemoryPlannerRepository(snapshot));

    const next = await service.cancelTask("pending");

    expect(next.tasks).toHaveLength(1);
    expect(next.tasks[0]).toMatchObject({
      id: "pending",
      title: "Acción pendiente",
      description: "Contexto que no debe perderse",
      date: "2026-09-12",
      goalId: "goal",
      status: "cancelled",
    });
    expect(next.tasks[0].focusPriority).toBeUndefined();
  });
});
