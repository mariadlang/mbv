import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "./planner";
import { preparationPatchSchema, preparationPeriod, weekPreparation } from "./weekPreparation";
import { createPlannerService } from "@/src/services/plannerService";
import { healthPreparation } from "./healthPreparation";
import type { PlannerSnapshot } from "./planner";

function fixture() {
  let snapshot = createEmptySnapshot();
  const service = createPlannerService({
    load: async () => structuredClone(snapshot),
    replace: async (next: PlannerSnapshot) => { snapshot = structuredClone(next); },
    clear: async () => { snapshot = createEmptySnapshot(); },
    close: () => undefined,
  });
  return { service, read: () => snapshot };
}
describe("weekly preparation shared state", () => {
  it("inherits monthly health planning and restores it after an isolated weekly exception", async () => {
    const { service, read } = fixture();
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "monthly", title: "Mi comida" });
    const meal = read().nutritionLogs[0].meals[0];
    expect(meal.completed).toBe(false);
    expect(healthPreparation(read(), "2026-10-02", "nutrition").recovered).toBe(true);
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "weekly", title: "Ajuste personal" });
    expect(read().nutritionLogs[0].meals).toHaveLength(1);
    expect(read().nutritionLogs[0].meals[0].id).toBe(meal.id);
    expect(healthPreparation(read(), "2026-10-02", "nutrition").monthly?.title).toBe("Mi comida");
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "monthly", title: "Nueva base mensual" });
    expect(read().nutritionLogs[0].meals[0].name).toBe("Ajuste personal");
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "weekly", title: "Restaurar", inherit: true });
    expect(read().nutritionLogs[0].meals[0]).toMatchObject({ id: meal.id, name: "Nueva base mensual", completed: false });
    expect(healthPreparation(read(), "2026-10-02", "nutrition").override).toBeUndefined();
  });
  it("allows a rest day without inventing a completed workout or altering existing session history", async () => {
    const { service, read } = fixture();
    await service.saveWorkoutPlan({ date: "2026-10-02", name: "Mi rutina", exercises: [] });
    await service.completeWorkout("2026-10-02");
    const before = read().workoutLogs[0];
    await service.saveHealthPreparation({ date: "2026-10-02", section: "training", scope: "monthly", title: "Descanso", rest: true });
    expect(read().workoutLogs).toHaveLength(1);
    expect(read().workoutLogs[0].id).toBe(before.id);
    expect(read().workoutLogs[0].completedSessions).toEqual(before.completedSessions);
    expect(healthPreparation(read(), "2026-10-02", "training").rest).toBe(true);
  });
  it("retains health provenance when a previously opened monthly editor saves unrelated fields", async () => {
    const { service, read } = fixture();
    const draft = { horizon: "monthly" as const, periodKey: "2026-10", intention: "Mi mes", priority: "", objectives: [], activities: [], details: {} };
    await service.saveCascadePlan(draft);
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "monthly", title: "Mi comida" });
    await service.saveCascadePlan({ ...draft, intention: "Nueva intención" });
    expect(healthPreparation(read(), "2026-10-02", "nutrition").recovered).toBe(true);
    expect(read().nutritionLogs[0].meals).toHaveLength(1);
  });
  it("retains activity IDs across legacy saves and explicit edits without accepting foreign IDs", async () => {
    const { service, read } = fixture();
    const input = { horizon: "monthly" as const, periodKey: "2026-10", intention: "Mi mes", priority: "", objectives: [], activities: [{ title: "Cita personal", type: "event" as const }] };
    await service.saveCascadePlan(input);
    const original = read().cascadePlans[0].activities[0].id;
    await service.saveCascadePlan(input);
    expect(read().cascadePlans[0].activities[0].id).toBe(original);
    await service.saveCascadePlan({ ...input, activities: [{ ...input.activities[0], id: original, title: "Cita reprogramada", date: "2026-10-12" }] });
    expect(read().cascadePlans[0].activities[0].id).toBe(original);
    await service.saveCascadePlan({ ...input, activities: [{ ...input.activities[0], id: "foreign-id" }] });
    expect(read().cascadePlans[0].activities[0].id).not.toBe("foreign-id");
  });
  it("has five default sections without inventing readiness", () => {
    const value = weekPreparation(createEmptySnapshot(), "2026-09-28");
    expect(value.active).toHaveLength(5);
    expect(value.ready).toBe(0);
    expect(value.percent).toBe(0);
  });
  it("uses ISO week-year at year boundaries and validates actual dates", () => {
    expect(preparationPeriod("2025-12-29")).toBe("2026-W01");
    expect(preparationPatchSchema.safeParse({ week: "2026-02-30", review: "skipped" }).success).toBe(false);
  });
  it("stores 3 of 5 as 60%, shares one plan and keeps prior canonical records", async () => {
    const { service, read } = fixture();
    await service.saveCascadePlan({ horizon: "weekly", periodKey: "2026-W40", intention: "Mi semana", priority: "", objectives: ["Prioridad"], activities: [{ title: "Acción original", type: "activity" }] });
    const old = read().cascadePlans[0];
    await Promise.all(["nutrition", "training", "agenda"].map((item) => service.saveWeekPreparation({ week: "2026-09-28", item, state: "ready" })));
    expect(read().cascadePlans).toHaveLength(1);
    expect(read().cascadePlans[0].id).toBe(old.id);
    expect(read().cascadePlans[0].activities).toEqual(old.activities);
    expect(weekPreparation(read(), "2026-09-28").percent).toBe(60);
    await service.saveWeekPreparation({ week: "2026-09-28", item: "habits", state: "excluded" });
    expect(weekPreparation(read(), "2026-09-28").percent).toBe(75);
    expect(weekPreparation(read(), "2026-10-05").percent).toBe(0);
  });
  it("skips and resumes review without changing tasks, retains cross-month context", async () => {
    const { service, read } = fixture();
    await service.createTask("Pendiente anterior", "2026-09-25");
    const tasks = structuredClone(read().tasks);
    await service.saveWeekPreparation({ week: "2026-09-28", month: "2026-10", review: "skipped" });
    expect(read().tasks).toEqual(tasks);
    const loaded = await service.load();
    expect(weekPreparation(loaded, "2026-09-28")).toMatchObject({ review: "skipped", month: "2026-10" });
  });
  it("moves, releases and restores the same task without a new ID or completion", async () => {
    const { service, read } = fixture();
    await service.createTask("Tarea independiente", "2026-09-25");
    const task = read().tasks[0];
    await service.rescheduleTask(task.id, "2026-10-02");
    await service.cancelTask(task.id);
    await service.restoreTask(task.id);
    expect(read().tasks).toHaveLength(1);
    expect(read().tasks[0]).toMatchObject({ id: task.id, date: "2026-10-02", status: "planned", createdAt: task.createdAt });
    expect(read().tasks[0].completedAt).toBeUndefined();
  });
  it("does not confuse habit completion with preparation", async () => {
    const { service, read } = fixture();
    await service.saveWeekPreparation({ week: "2026-09-28", item: "habits", state: "ready" });
    expect(read().habitLogs).toHaveLength(0);
    expect(weekPreparation(read(), "2026-09-28").rows.find((item) => item.id === "habits")?.state).toBe("ready");
  });
  it("zero active items is neutral and allows a light week to be confirmed", async () => {
    const { service, read } = fixture();
    await Promise.all(["nutrition", "training", "habits", "priorities", "agenda"].map((item) => service.saveWeekPreparation({ week: "2026-09-28", item, state: "excluded" })));
    expect(weekPreparation(read(), "2026-09-28")).toMatchObject({ active: [], ready: 0, percent: 0 });
    await service.saveWeekPreparation({ week: "2026-09-28", item: "agenda", state: "ready" });
    expect(weekPreparation(read(), "2026-09-28").percent).toBe(100);
    expect(read().tasks).toHaveLength(0);
  });
});
