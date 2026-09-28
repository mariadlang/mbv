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

const timestamp = "2026-09-24T12:00:00.000Z";

function projectSnapshot(taskStatus: "planned" | "completed") {
  const snapshot = createEmptySnapshot();
  snapshot.projects = [{ id: "project", name: "Preparar lanzamiento", outcome: "Publicar la versión", status: "active", createdAt: timestamp, updatedAt: timestamp }];
  snapshot.tasks = [{ id: "task", title: "Revisar versión", projectId: "project", priority: "medium", status: taskStatus, createdAt: timestamp, updatedAt: timestamp }];
  return snapshot;
}

describe("plannerService.updateProjectStatus", () => {
  it("closes a project only after all its work is complete and can reopen it", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(projectSnapshot("completed")));

    const closed = await service.updateProjectStatus("project", "completed");
    expect(closed.projects[0].status).toBe("completed");
    expect(closed.projects[0].updatedAt).not.toBe(timestamp);

    const reopened = await service.updateProjectStatus("project", "active");
    expect(reopened.projects[0].status).toBe("active");
  });

  it("does not close a project with pending work", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(projectSnapshot("planned")));

    const next = await service.updateProjectStatus("project", "completed");

    expect(next.projects[0].status).toBe("active");
  });
});
