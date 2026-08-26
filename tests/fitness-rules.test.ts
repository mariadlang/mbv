import { describe, expect, it } from "vitest";
import { dailyNutritionTotals, mealCompletionPercent, normalizedExerciseSets } from "@/src/domain/fitnessRules";

describe("fitness rules", () => {
  it("adds calories and macros without inventing missing values", () => {
    expect(dailyNutritionTotals([
      { id: "breakfast", name: "Desayuno", calories: 420, protein: 30, carbs: 40, fat: 12 },
      { id: "lunch", name: "Almuerzo", calories: 600, protein: 40, carbs: 60, fat: 15 },
      { id: "note", name: "Comida sin detalle" },
    ])).toEqual({ calories: 1020, protein: 70, carbs: 100, fat: 27 });
  });

  it("keeps independent sets and adapts legacy scalar exercises", () => {
    const legacy = normalizedExerciseSets({ id: "hip", name: "Hip Thrust", sets: 3, reps: 10, weight: 70 });
    expect(legacy.map((set) => [set.reps, set.weight])).toEqual([[10, 70], [10, 70], [10, 70]]);

    const independent = normalizedExerciseSets({
      id: "hip", name: "Hip Thrust", sets: 2, reps: 12, weight: 70,
      setDetails: [
        { id: "s1", setNumber: 1, reps: 12, weight: 70 },
        { id: "s2", setNumber: 2, reps: 8, weight: 80 },
      ],
    });
    expect(independent.map((set) => [set.reps, set.weight])).toEqual([[12, 70], [8, 80]]);
  });

  it("caps meal completion at one hundred percent", () => {
    expect(mealCompletionPercent(2, 4)).toBe(50);
    expect(mealCompletionPercent(5, 4)).toBe(100);
  });
});
