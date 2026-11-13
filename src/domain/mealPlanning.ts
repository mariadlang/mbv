import { z } from "zod";
import { isValidCalendarDateKey } from "./calendar";
import type { MealLog, PlannerSnapshot } from "./planner";
import { healthPreparation, mealPlanContent, preserveMonthlyHealthDetail, storeHealthVersion } from "./healthPreparation";

export const mainMealSlots = ["breakfast", "lunch", "dinner"] as const;
export const plannedMealSchema = z.object({
  date: z.string().refine(isValidCalendarDateKey),
  mealId: z.string().min(1),
  slot: z.enum([...mainMealSlots, "snack"]).optional(),
  name: z.string().trim().min(1).max(300),
});
export type PlannedMealInput = z.infer<typeof plannedMealSchema>;

export function mealsForDate(snapshot: PlannerSnapshot, date: string) {
  return snapshot.nutritionLogs.find((log) => log.date === date)?.meals ?? [];
}

/** A category is optional for old backups. Never guess a category from user text. */
export function applyPlannedMeal(snapshot: PlannerSnapshot, input: PlannedMealInput, now: string, createId: () => string): PlannerSnapshot {
  const parsed = plannedMealSchema.parse(input);
  const log = snapshot.nutritionLogs.find((item) => item.date === parsed.date);
  const previous = log?.meals.find((meal) => meal.id === parsed.mealId)
    ?? (parsed.slot && parsed.slot !== "snack" ? log?.meals.find((meal) => meal.slot === parsed.slot) : undefined);
  if (!previous && !parsed.slot) throw new Error("An existing meal is required without a category");
  if (previous?.slot && parsed.slot !== previous.slot) throw new Error("Meal category changed during editing");
  const meal: MealLog = { ...previous, id: previous?.id ?? parsed.mealId, name: parsed.name, ...(parsed.slot ? { slot: parsed.slot } : {}), completed: previous?.completed ?? false };
  const preserved = preserveMonthlyHealthDetail(snapshot, parsed.date, "nutrition", now, createId);
  const current = healthPreparation(preserved, parsed.date, "nutrition");
  // Only the existing monthly-linked meal needs a version override. Other meals
  // remain canonical day records and never replace that monthly relationship.
  const next = current.source?.recordId === meal.id
    ? storeHealthVersion(preserved, parsed.date, "nutrition", "weekly", { recordId: meal.id, title: meal.name, rest: false, content: mealPlanContent(meal) }, now, createId)
    : preserved;
  const updated = { id: log?.id ?? createId(), date: parsed.date, createdAt: log?.createdAt ?? now, updatedAt: now,
    meals: previous ? log!.meals.map((item) => item.id === previous.id ? meal : item) : [...(log?.meals ?? []), meal] };
  return { ...next, nutritionLogs: log ? next.nutritionLogs.map((item) => item.id === log.id ? updated : item) : [...next.nutritionLogs, updated] };
}
