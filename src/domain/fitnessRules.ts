import type { MealLog, WorkoutExercise, WorkoutSet } from "@/src/domain/planner";

export function dailyNutritionTotals(meals: MealLog[]) {
  return meals.reduce((total, meal) => ({
    calories: total.calories + (meal.calories ?? 0),
    protein: total.protein + (meal.protein ?? 0),
    carbs: total.carbs + (meal.carbs ?? 0),
    fat: total.fat + (meal.fat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function normalizedExerciseSets(exercise: WorkoutExercise): WorkoutSet[] {
  return exercise.setDetails?.length
    ? exercise.setDetails
    : Array.from({ length: Math.max(1, exercise.sets) }, (_, index) => ({
        id: `${exercise.id}-set-${index + 1}`,
        setNumber: index + 1,
        reps: exercise.reps,
        weight: exercise.weight,
      }));
}

export function mealCompletionPercent(mealCount: number, target: number) {
  if (target <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, mealCount / target * 100)));
}
