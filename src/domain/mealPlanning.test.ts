import { describe, expect, it } from "vitest";
import { createEmptySnapshot, type PlannerSnapshot } from "./planner";
import { createPlannerService } from "@/src/services/plannerService";
import { plannerSnapshotSchema } from "@/src/lib/schemas";
import { healthPreparation } from "./healthPreparation";
import { mealsForDate } from "./mealPlanning";

const date = "2026-11-13";
function fixture() {
  let data = createEmptySnapshot();
  let fail = false;
  const repository = { load: async () => structuredClone(data), replace: async (next: PlannerSnapshot) => { if (fail) throw new Error("storage full"); data = structuredClone(next); }, clear: async () => { data = createEmptySnapshot(); }, close: () => undefined };
  return { service: createPlannerService(repository), repository, read: () => data, fail: (value: boolean) => { fail = value; } };
}

describe("planned meals share canonical day records", () => {
  it("serializes concurrent submissions, preserves IDs and other dates, and reloads without consumption", async () => {
    const { service, repository, read } = fixture();
    await Promise.all([
      service.savePlannedMeal({ date, mealId: "first", slot: "breakfast", name: "Huevos" }),
      service.savePlannedMeal({ date, mealId: "second-click", slot: "breakfast", name: "Huevos y pan" }),
    ]);
    const logId = read().nutritionLogs[0].id;
    await service.savePlannedMeal({ date: "2026-11-20", mealId: "next-week", slot: "breakfast", name: "Tostada" });
    await service.savePlannedMeal({ date: "2026-11-14", mealId: "tomorrow", slot: "dinner", name: "Sopa" });
    await service.savePlannedMeal({ date, mealId: "first", slot: "breakfast", name: "Huevos revisados desde Mi día" });
    const reloaded = await createPlannerService(repository).load();
    expect(mealsForDate(reloaded, date)).toEqual([{ id: "first", slot: "breakfast", name: "Huevos revisados desde Mi día", completed: false }]);
    expect(reloaded.nutritionLogs.find((log) => log.date === date)?.id).toBe(logId);
    expect(mealsForDate(reloaded, "2026-11-20")[0].name).toBe("Tostada");
    expect(mealsForDate(reloaded, "2026-11-14")[0].name).toBe("Sopa");
    expect(mealsForDate((await fixture().service.load()), date)).toEqual([]);
  });

  it("keeps legacy detail, monthly original, completion state and unrelated meals through a weekly edit and restoration", async () => {
    const { service, read } = fixture();
    await service.saveMeal({ date, name: "Plan original", notes: "Nota antigua", calories: 250, completed: true }, "monthly");
    const original = structuredClone(mealsForDate(read(), date)[0]);
    const monthly = structuredClone(read().cascadePlans[0]);
    await service.savePlannedMeal({ date, mealId: "lunch", slot: "lunch", name: "Arroz" });
    await service.savePlannedMeal({ date, mealId: original.id, name: "Ajuste del día" });
    expect(read().cascadePlans.find((plan) => plan.horizon === "monthly")).toEqual(monthly);
    expect(healthPreparation(read(), date, "nutrition").override?.recordId).toBe(original.id);
    expect(mealsForDate(read(), date)[0]).toEqual({ ...original, name: "Ajuste del día" });
    await service.saveHealthPreparation({ date, section: "nutrition", scope: "weekly", title: "Restaurar", inherit: true });
    expect(mealsForDate(read(), date)[0]).toEqual(original);
    expect(mealsForDate(read(), date)[1]).toMatchObject({ id: "lunch", name: "Arroz", slot: "lunch", completed: false });
  });

  it("supports multiple snacks, rejects empty input, and retains categories in backup and old detailed editors", async () => {
    const { service, read } = fixture();
    await expect(service.savePlannedMeal({ date, mealId: "empty", slot: "snack", name: " " })).rejects.toThrow();
    expect(read().nutritionLogs).toEqual([]);
    const snack = { date, mealId: "snack1", slot: "snack" as const, name: "Manzana" };
    await service.savePlannedMeal(snack);
    await service.savePlannedMeal(snack);
    await service.savePlannedMeal({ ...snack, mealId: "snack2", name: "Nueces" });
    await service.saveMeal({ date, mealId: "snack1", name: "Manzana verde", notes: "Una nota", completed: false });
    const restored = plannerSnapshotSchema.parse(JSON.parse(JSON.stringify(read())));
    expect(restored.nutritionLogs.find((log) => log.date === date)!.meals.map((meal) => [meal.id, meal.slot, meal.name])).toEqual([["snack1", "snack", "Manzana verde"], ["snack2", "snack", "Nueces"]]);
  });

  it("does not acknowledge a failed write and retries the same snack identity", async () => {
    const { service, read, fail } = fixture();
    const input = { date, mealId: "retry", slot: "snack" as const, name: "Fruta" };
    fail(true);
    await expect(service.savePlannedMeal(input)).rejects.toThrow("storage full");
    expect(read().nutritionLogs).toEqual([]);
    fail(false);
    await service.savePlannedMeal(input);
    expect(mealsForDate(read(), date)).toEqual([{ id: "retry", slot: "snack", name: "Fruta", completed: false }]);
  });
});
