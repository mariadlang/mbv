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

function snapshotWithLegacyScores() {
  const snapshot = createEmptySnapshot();
  snapshot.lifeAreas = [{
    id: "health", name: "Salud", color: "sage", order: 0, active: true,
    currentScore: 6, desiredScore: 8, createdAt: timestamp, updatedAt: timestamp,
  }];
  return snapshot;
}

describe("plannerService life area ratings", () => {
  it("saves a reflection without implicitly confirming legacy scores", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(snapshotWithLegacyScores()));
    const next = await service.updateLifeArea("health", { vision: "Vivir con más energía" });
    expect(next.lifeAreas[0]).toMatchObject({ vision: "Vivir con más energía", currentScore: 6, desiredScore: 8 });
    expect(next.lifeAreas[0].scoresConfirmedAt).toBeUndefined();
  });

  it("confirms ratings only through the explicit operation", async () => {
    const service = createPlannerService(new MemoryPlannerRepository(snapshotWithLegacyScores()));
    const next = await service.updateLifeArea("health", { vision: "", currentScore: 7, desiredScore: 9, confirmScores: true });
    expect(next.lifeAreas[0]).toMatchObject({ currentScore: 7, desiredScore: 9 });
    expect(next.lifeAreas[0].scoresConfirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
