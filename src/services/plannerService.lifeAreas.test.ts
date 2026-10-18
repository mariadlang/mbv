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

const onboarding = { name: "Prueba H09", intention: "Cuidar mi tiempo", usePurpose: "Organizar mis pasos", weekStartsOn: 1 as const, selectedAreaNames: ["Desarrollo personal / Crecimiento"] };

describe("H09 life area identity across loads", () => {
  async function setup() {
    const repository = new MemoryPlannerRepository(createEmptySnapshot());
    const service = createPlannerService(repository);
    const snapshot = await service.completeOnboarding(onboarding);
    return { repository, service, snapshot, area: snapshot.lifeAreas[3] };
  }

  it("keeps the exact collection after renaming, reordering, deactivating and repeated loads", async () => {
    const { repository, service, area } = await setup();
    await service.createLifeArea({ name: "Taller H09", category: "Propia" });
    await service.updateLifeAreaSettings(area.id, { direction: "up" });
    await service.updateLifeAreaSettings(area.id, { name: "AUD18 Área de prueba", active: false });
    const expected = structuredClone(repository.snapshot.lifeAreas);
    for (let iteration = 0; iteration < 4; iteration++) {
      const loaded = await service.load();
      expect(loaded.lifeAreas).toEqual(expected);
      expect(loaded.profile?.priorityAreaIds).toEqual([area.id]);
      expect(loaded.lifeAreas.some((item) => item.name === area.name)).toBe(false);
    }
    expect((await service.resumeExistingSpace("No reemplazar perfil")).lifeAreas).toEqual(expected);
  });

  it("preserves relationships, all collection contents and customization through backup v3", async () => {
    const { repository, service, area } = await setup();
    await service.createGoal({ title: "Meta H09", reason: "Una razón propia", lifeAreaId: area.id, progressType: "tasks", priority: "medium" }, []);
    await service.updateLifeAreaSettings(area.id, { name: "Proyecto propio", direction: "down" });
    const expected = structuredClone(repository.snapshot);
    const backup = await service.exportBackup();
    await service.clear();
    await service.importBackup(backup);
    expect(await service.load()).toEqual(expected);
    expect((await service.load()).goals[0].lifeAreaId).toBe(area.id);
  });

  it.each([1, 2] as const)("preserves an existing customized collection imported from backup v%s", async (version) => {
    const { repository, service, area } = await setup();
    await service.updateLifeAreaSettings(area.id, { name: "Carrera", direction: "up", active: false });
    const source = structuredClone(repository.snapshot);
    const restored = await service.importBackup(JSON.stringify({ schemaVersion: version, exportedAt: timestamp, data: { ...source, schemaVersion: version } }));
    expect(restored.lifeAreas).toEqual(source.lifeAreas);
    expect((await service.load()).lifeAreas).toEqual(source.lifeAreas);
    expect((await service.resumeExistingSpace("Prueba")).profile?.priorityAreaIds).toEqual([area.id]);
  });

  it("initializes only an empty collection once and keeps two repositories isolated", async () => {
    const first = await setup();
    await first.service.updateLifeAreaSettings(first.area.id, { name: "Sólo cuenta A" });
    const second = await setup();
    const secondIds = second.snapshot.lifeAreas.map((area) => area.id);
    expect(secondIds).toHaveLength(8);
    expect(secondIds.some((id) => first.snapshot.lifeAreas.some((area) => area.id === id))).toBe(false);
    for (let n = 0; n < 3; n++) expect((await second.service.load()).lifeAreas.map((area) => area.id)).toEqual(secondIds);
    expect((await first.service.load()).lifeAreas.find((area) => area.id === first.area.id)?.name).toBe("Sólo cuenta A");
    second.repository.snapshot.lifeAreas = [];
    const initialized = await second.service.load();
    expect(initialized.lifeAreas).toHaveLength(8);
    expect((await second.service.load()).lifeAreas).toEqual(initialized.lifeAreas);
    const empty = createPlannerService(new MemoryPlannerRepository(createEmptySnapshot()));
    expect((await empty.load()).lifeAreas).toEqual([]);
  });
});
