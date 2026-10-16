import { describe, expect, it } from "vitest";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerRepository } from "@/src/repositories/interfaces/PlannerRepository";
import { createPlannerService } from "./plannerService";

class MemoryRepository implements PlannerRepository {
  constructor(public snapshot: PlannerSnapshot) {}
  async load() { return structuredClone(this.snapshot); }
  async replace(snapshot: PlannerSnapshot) { this.snapshot = structuredClone(snapshot); }
  async clear() { this.snapshot = createEmptySnapshot(); }
  close() {}
}
function setup() {
  const snapshot = createEmptySnapshot();
  snapshot.tasks = [{ id: "canonical", title: "Leer capítulos", date: "2026-10-02", time: "08:30", estimatedMinutes: 45, priority: "medium", focusPriority: 1, periodPlanId: "month", planActionKey: "priority-1", status: "in_progress", createdAt: "2026-10-01T12:00:00Z", updatedAt: "2026-10-01T12:00:00Z" }];
  return createPlannerService(new MemoryRepository(snapshot));
}
describe("editing canonical task agenda timing", () => {
  it("moves and edits the same task without losing monthly identity, focus or execution state", async () => {
    const service = setup();
    const result = await service.updateTask("canonical", { title: "Leer capítulos 3 y 4", date: "2026-10-03", time: "09:15", estimatedMinutes: 60 });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({ id: "canonical", date: "2026-10-03", time: "09:15", estimatedMinutes: 60, periodPlanId: "month", planActionKey: "priority-1", focusPriority: 1, status: "in_progress" });
    expect((await service.load()).tasks).toEqual(result.tasks);
  });
  it("does not invent timing and only clears it on an explicit edit", async () => {
    const service = setup();
    expect((await service.updateTask("canonical", { title: "Leer después" })).tasks[0]).toMatchObject({ time: "08:30", estimatedMinutes: 45 });
    const result = await service.updateTask("canonical", { title: "Leer sin hora", time: undefined, estimatedMinutes: undefined });
    expect(result.tasks[0].time).toBeUndefined();
    expect(result.tasks[0].estimatedMinutes).toBeUndefined();
  });
  it.each([{ time: "25:00" }, { time: "09:99" }, { estimatedMinutes: 0 }, { estimatedMinutes: 1.5 }, { estimatedMinutes: 1441 }])("rejects invalid timing without mutating data: %j", async (patch) => {
    const service = setup();
    const before = await service.load();
    await expect(service.updateTask("canonical", { title: "Invalid", ...patch })).rejects.toThrow();
    expect(await service.load()).toEqual(before);
  });
});
