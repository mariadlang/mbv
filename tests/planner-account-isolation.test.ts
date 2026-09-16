import { describe, expect, it } from "vitest";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerRepository } from "@/src/repositories/interfaces/PlannerRepository";
import {
  assertPlannerMetadataOwner,
  plannerDatabaseNameForOwner,
  type PlannerMetadataRecord,
} from "@/src/repositories/local/IndexedDbPlannerRepository";
import { createPlannerService } from "@/src/services/plannerService";

const now = "2026-09-16T12:00:00.000Z";

class MemoryPlannerRepository implements PlannerRepository {
  closed = false;
  constructor(public snapshot: PlannerSnapshot) {}
  async load() { return structuredClone(this.snapshot); }
  async replace(snapshot: PlannerSnapshot) { this.snapshot = structuredClone(snapshot); }
  async clear() { this.snapshot = createEmptySnapshot(); }
  close() { this.closed = true; }
}

function snapshotWithTask(id: string, title: string): PlannerSnapshot {
  return {
    ...createEmptySnapshot(),
    tasks: [{ id, title, priority: "high", status: "inbox", createdAt: now, updatedAt: now }],
  };
}

describe("planner account isolation", () => {
  it("keeps A and B in separate repositories and clear only affects the active owner", async () => {
    const repositoryA = new MemoryPlannerRepository(snapshotWithTask("a-task", "Privado A"));
    const repositoryB = new MemoryPlannerRepository(snapshotWithTask("b-task", "Privado B"));
    const serviceA = createPlannerService(repositoryA);
    const serviceB = createPlannerService(repositoryB);

    expect((await serviceA.load()).tasks.map((task) => task.title)).toEqual(["Privado A"]);
    expect((await serviceB.load()).tasks.map((task) => task.title)).toEqual(["Privado B"]);

    await serviceB.clear();

    expect((await serviceB.load()).tasks).toEqual([]);
    expect((await serviceA.load()).tasks.map((task) => task.title)).toEqual(["Privado A"]);
  });

  it("uses stable account-scoped database names and rejects unsafe owner ids", () => {
    expect(plannerDatabaseNameForOwner("account-A_123")).toBe("my-best-version-planner-v4:account-A_123");
    expect(() => plannerDatabaseNameForOwner("maria@example.com")).toThrow("INVALID_PLANNER_OWNER_ID");
  });

  it("rejects metadata belonging to another owner", () => {
    const metadata: PlannerMetadataRecord = { key: "planner", schemaVersion: 3, updatedAt: now, ownerId: "account-a" };
    expect(() => assertPlannerMetadataOwner(metadata, "account-a")).not.toThrow();
    expect(() => assertPlannerMetadataOwner(metadata, "account-b")).toThrow("PLANNER_OWNER_MISMATCH");
    expect(() => assertPlannerMetadataOwner({ ...metadata, ownerId: undefined }, "account-a")).toThrow("PLANNER_OWNER_MISMATCH");
  });

  it("keeps backups portable and free of account ownership metadata", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(snapshotWithTask("task", "Portable")));
    const backup = JSON.parse(await service.exportBackup()) as Record<string, unknown>;
    expect(backup).not.toHaveProperty("ownerId");
    expect(backup.data).not.toHaveProperty("ownerId");
  });
});
