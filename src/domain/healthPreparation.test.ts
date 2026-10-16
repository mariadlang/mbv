import { describe, expect, it } from "vitest";
import { createEmptySnapshot, type PlannerSnapshot } from "./planner";
import { createPlannerService } from "@/src/services/plannerService";
import { healthLibrary, healthPreparation, hasHealthDetail } from "./healthPreparation";

function fixture() {
  let snapshot = createEmptySnapshot();
  const service = createPlannerService({ load: async () => structuredClone(snapshot), replace: async (next: PlannerSnapshot) => { snapshot = structuredClone(next); }, clear: async () => { snapshot = createEmptySnapshot(); }, close: () => undefined });
  return { service, read: () => snapshot };
}
describe("detailed health plan versions", () => {
  it("reuses actual meal detail, adjusts a week and restores the month with one identity and no consumption", async () => {
    const { service, read } = fixture();
    await service.saveMeal({ date: "2026-09-30", name: "Mi almuerzo", calories: 420, protein: 20, carbs: 50, fat: 12, notes: "Arroz 100 g; lentejas 150 g", completed: true });
    const original = read().nutritionLogs[0].meals[0];
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "monthly", title: original.name, sourceDate: "2026-09-30", sourceRecordId: original.id });
    const target = read().nutritionLogs.find((log) => log.date === "2026-10-02")!.meals[0];
    expect(target).toMatchObject({ calories: 420, notes: original.notes, completed: false });
    expect(target.id).not.toBe(original.id);
    await service.saveMeal({ ...target, mealId: target.id, date: "2026-10-02", name: "Ajuste", calories: 500, notes: "Otra cantidad" }, "weekly");
    expect(healthPreparation(read(), "2026-10-02", "nutrition").monthly?.content).toMatchObject({ calories: 420, notes: original.notes });
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "weekly", title: "Restaurar", inherit: true });
    const restored = (await service.load()).nutritionLogs.find((log) => log.date === "2026-10-02")!;
    expect(restored.meals).toHaveLength(1);
    expect(restored.meals[0]).toEqual(target);
    expect(read().nutritionLogs.find((log) => log.date === "2026-09-30")!.meals[0]).toEqual(original);
  });
  it("preserves exercises, set IDs and performed history through a rest override and month restoration", async () => {
    const { service, read } = fixture();
    await service.saveWorkoutPlan({ date: "2026-10-01", name: "Rutina real", durationMinutes: 35, exercises: [{ name: "Sentadilla", sets: [{ setNumber: 1, reps: 8, weight: 12 }, { setNumber: 2, reps: 6, weight: 14 }] }] });
    await service.completeWorkout("2026-10-01");
    const source = read().workoutLogs[0];
    await service.saveHealthPreparation({ date: "2026-10-02", section: "training", scope: "monthly", title: source.name!, sourceDate: source.date, sourceRecordId: source.id });
    const target = read().workoutLogs.find((log) => log.date === "2026-10-02")!;
    expect(target.completedSessions).toEqual([]);
    expect(target.exercises[0].id).not.toBe(source.exercises[0].id);
    expect(target.exercises[0].setDetails?.map((set) => [set.reps, set.weight])).toEqual([[8, 12], [6, 14]]);
    await service.completeWorkout(target.date);
    const history = structuredClone(read().workoutLogs.find((log) => log.id === target.id)!.completedSessions);
    await service.saveWorkoutPlan({ date: target.date, name: "Rutina semanal", durationMinutes: 20, exercises: [{ name: "Remo", sets: [{ setNumber: 1, reps: 10, weight: 6 }] }] }, "weekly");
    await service.saveHealthPreparation({ date: target.date, section: "training", scope: "weekly", title: "Descanso", rest: true });
    expect(healthPreparation(read(), target.date, "training").rest).toBe(true);
    await service.saveHealthPreparation({ date: target.date, section: "training", scope: "weekly", title: "Restaurar", inherit: true });
    const restored = (await service.load()).workoutLogs.find((log) => log.id === target.id)!;
    expect(restored.exercises).toEqual(target.exercises);
    expect(restored.durationMinutes).toBe(35);
    expect(restored.completedSessions).toEqual(history);
    expect(read().workoutLogs.filter((log) => log.date === target.date)).toHaveLength(1);
  });
  it("edits a monthly version without replacing its active weekly exception", async () => {
    const { service, read } = fixture();
    await service.saveMeal({ date: "2026-10-02", name: "Base", notes: "Cantidad original", completed: false }, "monthly");
    const meal = read().nutritionLogs[0].meals[0];
    await service.saveMeal({ date: "2026-10-02", mealId: meal.id, name: "Excepción", notes: "Cantidad semanal", completed: false }, "weekly");
    await service.saveMeal({ date: "2026-10-02", mealId: meal.id, name: "Base editada", notes: "Nueva cantidad del mes", completed: false }, "monthly");
    expect(read().nutritionLogs[0].meals[0].name).toBe("Excepción");
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "weekly", title: "Restaurar", inherit: true });
    expect(read().nutritionLogs[0].meals[0]).toMatchObject({ id: meal.id, name: "Base editada", notes: "Nueva cantidad del mes" });
  });
  it("labels title-only records incomplete and refuses them as detailed templates", async () => {
    const { service, read } = fixture();
    await service.saveMeal({ date: "2026-10-01", name: "Solo título", calories: 0 });
    const item = healthLibrary(read(), "nutrition")[0];
    expect(hasHealthDetail(item.content)).toBe(false);
    await expect(service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "weekly", title: item.title, sourceDate: item.date, sourceRecordId: item.recordId })).rejects.toThrow("real saved detail");
    expect(read().nutritionLogs).toHaveLength(1);
  });
  it("captures legacy detail before the first override without migrating unrelated plans", async () => {
    const { service, read } = fixture();
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "monthly", title: "Base" });
    const meal = read().nutritionLogs[0].meals[0];
    // Simulates an earlier client that edited a canonical record without writing a content version.
    meal.notes = "Detalle previo";
    await service.saveMeal({ ...meal, mealId: meal.id, date: "2026-10-02", name: "Excepción", notes: "Detalle semanal" }, "weekly");
    await service.saveHealthPreparation({ date: "2026-10-02", section: "nutrition", scope: "weekly", title: "Restaurar", inherit: true });
    expect(read().nutritionLogs[0].meals[0]).toMatchObject({ id: meal.id, notes: "Detalle previo" });
  });
});
