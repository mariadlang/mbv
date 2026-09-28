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

const timestamp = "2026-09-17T12:00:00.000Z";

function measuredSnapshot() {
  const snapshot = createEmptySnapshot();
  snapshot.habits = [{
    id: "water",
    name: "Beber agua",
    type: "quantity",
    scheduledDays: [4],
    trackingStartDate: "2026-09-17",
    target: 10,
    unit: "vasos",
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  }];
  snapshot.habitLogs = [{ id: "partial", habitId: "water", date: "2026-09-17", value: 4, createdAt: timestamp, updatedAt: timestamp }];
  return snapshot;
}

describe("plannerService measured habit entries", () => {
  it("never removes partial progress through the boolean toggle", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(measuredSnapshot()));
    const next = await service.toggleHabit("water", "2026-09-17");
    expect(next.habitLogs).toEqual(expect.arrayContaining([expect.objectContaining({ id: "partial", value: 4 })]));
  });

  it("updates a partial entry in place and persists it across reload", async () => {
    const repository = new MemoryPlannerRepository(measuredSnapshot());
    const service = createPlannerService(repository);
    const next = await service.setHabitProgress("water", "2026-09-17", 6);
    expect(next.habitLogs).toEqual(expect.arrayContaining([expect.objectContaining({ id: "partial", value: 6 })]));
    expect((await service.load()).habitLogs).toEqual(expect.arrayContaining([expect.objectContaining({ id: "partial", value: 6 })]));
  });

  it("deletes a measured entry only through the explicit delete operation", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(measuredSnapshot()));
    const next = await service.deleteHabitLog("water", "2026-09-17");
    expect(next.habitLogs).toEqual([]);
  });
});
