import { z } from "zod";
import type { CascadePlan, MealLog, PlannerSnapshot, WorkoutLog } from "./planner";
import { isValidCalendarDateKey } from "./calendar";
import { preparationPeriod } from "./weekPreparation";

export const healthPreparationSchema = z.object({
  date: z.string().refine(isValidCalendarDateKey),
  section: z.enum(["nutrition", "training"]),
  scope: z.enum(["monthly", "weekly"]),
  title: z.string().trim().min(2).max(300),
  rest: z.boolean().default(false),
  inherit: z.boolean().default(false),
  sourceDate: z.string().refine(isValidCalendarDateKey).optional(),
  sourceRecordId: z.string().min(1).optional(),
}).refine((input) => input.section === "training" || !input.rest);
export type HealthPreparationInput = z.input<typeof healthPreparationSchema>;
export type HealthScope = "monthly" | "weekly";
const mealContentSchema = z.object({ kind: z.literal("nutrition"), calories: z.number().nonnegative().optional(), protein: z.number().nonnegative().optional(), carbs: z.number().nonnegative().optional(), fat: z.number().nonnegative().optional(), notes: z.string().optional() });
const setSchema = z.object({ id: z.string(), setNumber: z.number(), reps: z.number(), weight: z.number() });
const workoutContentSchema = z.object({ kind: z.literal("training"), goal: z.string().optional(), durationMinutes: z.number().optional(), exercises: z.array(z.object({ id: z.string(), name: z.string(), sets: z.number(), reps: z.number(), weight: z.number(), setDetails: z.array(setSchema).optional() })) });
const entrySchema = z.object({ title: z.string(), rest: z.boolean(), recordId: z.string(), content: z.discriminatedUnion("kind", [mealContentSchema, workoutContentSchema]).optional() });
export type HealthPlanEntry = z.infer<typeof entrySchema>;
export type HealthContent = NonNullable<HealthPlanEntry["content"]>;
export function mealPlanContent(meal: MealLog): HealthContent {
  return { kind: "nutrition", calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, notes: meal.notes };
}
export function workoutPlanContent(workout: WorkoutLog): HealthContent {
  return { kind: "training", goal: workout.goal, durationMinutes: workout.durationMinutes, exercises: structuredClone(workout.exercises) };
}
export function hasHealthDetail(content?: HealthContent) {
  return content?.kind === "nutrition" ? Boolean(content.notes?.trim() || [content.calories, content.protein, content.carbs, content.fat].some((value) => typeof value === "number" && value > 0))
    : content?.kind === "training" ? Boolean(content.exercises.length || (content.durationMinutes ?? 0) > 0 || content.goal?.trim()) : false;
}
export function healthLibrary(snapshot: PlannerSnapshot, section: "nutrition" | "training") {
  return section === "nutrition"
    ? snapshot.nutritionLogs.flatMap((log) => log.meals.map((meal) => ({ date: log.date, recordId: meal.id, title: meal.name, content: mealPlanContent(meal) })))
    : snapshot.workoutLogs.map((log) => ({ date: log.date, recordId: log.id, title: log.name || log.goal || "", content: workoutPlanContent(log) }));
}
export const healthPlanKey = (section: "nutrition" | "training", date: string) => `health.v1.${section}.${date}`;
export function healthPlanEntry(value?: string) {
  if (!value) return undefined;
  try { const result = entrySchema.safeParse(JSON.parse(value)); return result.success ? result.data : undefined; } catch { return undefined; }
}
export function healthPreparation(snapshot: PlannerSnapshot, date: string, section: "nutrition" | "training") {
  const key = healthPlanKey(section, date);
  const monthly = healthPlanEntry(snapshot.cascadePlans.find((plan) => plan.horizon === "monthly" && plan.periodKey === date.slice(0, 7))?.details?.[key]);
  const override = healthPlanEntry(snapshot.cascadePlans.find((plan) => plan.horizon === "weekly" && plan.periodKey === preparationPeriod(date))?.details?.[key]);
  const source = override || monthly;
  const meal = snapshot.nutritionLogs.find((log) => log.date === date)?.meals.find((item) => item.id === source?.recordId);
  const workout = snapshot.workoutLogs.find((log) => log.date === date);
  const title = section === "nutrition" ? meal?.name : workout?.name;
  return { monthly, override, source, meal, workout, title: title || source?.title || "", recovered: Boolean(monthly && !override && title === monthly.title), rest: Boolean(source?.rest && title === source.title) };
}

/** Plan versions store only planned content; completion and session history stay canonical. */
export function storeHealthVersion(snapshot: PlannerSnapshot, date: string, section: "nutrition" | "training", scope: HealthScope, entry: HealthPlanEntry | undefined, now: string, createId: () => string): PlannerSnapshot {
  const periodKey = scope === "monthly" ? date.slice(0, 7) : preparationPeriod(date);
  const previous = snapshot.cascadePlans.find((plan) => plan.horizon === scope && plan.periodKey === periodKey);
  const details = { ...previous?.details };
  if (entry) details[healthPlanKey(section, date)] = JSON.stringify(entry); else delete details[healthPlanKey(section, date)];
  if (scope === "weekly" && !details["preparation.v1.month"]) details["preparation.v1.month"] = date.slice(0, 7);
  const plan: CascadePlan = previous ? { ...previous, details, updatedAt: now } : { id: createId(), horizon: scope, periodKey, intention: "", priority: "", objectives: [], activities: [], details, createdAt: now, updatedAt: now };
  return { ...snapshot, cascadePlans: previous ? snapshot.cascadePlans.map((item) => item.id === plan.id ? plan : item) : [...snapshot.cascadePlans, plan] };
}

/** Freeze a legacy title-only base before the first weekly edit overwrites its real record. */
export function preserveMonthlyHealthDetail(snapshot: PlannerSnapshot, date: string, section: "nutrition" | "training", now: string, createId: () => string) {
  const current = healthPreparation(snapshot, date, section);
  if (!current.monthly || current.monthly.content || current.override) return snapshot;
  const content = section === "nutrition" && current.meal ? mealPlanContent(current.meal) : section === "training" && current.workout ? workoutPlanContent(current.workout) : undefined;
  return content ? storeHealthVersion(snapshot, date, section, "monthly", { ...current.monthly, content }, now, createId) : snapshot;
}

export function applyHealthVersion(snapshot: PlannerSnapshot, date: string, entry: HealthPlanEntry, section: "nutrition" | "training", now: string, createId: () => string): PlannerSnapshot {
  if (section === "nutrition") {
    const nutrition = snapshot.nutritionLogs.find((log) => log.date === date);
    const oldMeal = nutrition?.meals.find((meal) => meal.id === entry.recordId);
    const content = entry.content?.kind === "nutrition" ? entry.content : oldMeal;
    const meal: MealLog = { id: entry.recordId, name: entry.title, calories: content?.calories, protein: content?.protein, carbs: content?.carbs, fat: content?.fat, notes: content?.notes, completed: oldMeal?.completed ?? false };
    const log = { id: nutrition?.id || createId(), date, meals: oldMeal ? nutrition!.meals.map((item) => item.id === oldMeal.id ? meal : item) : [...(nutrition?.meals || []), meal], createdAt: nutrition?.createdAt || now, updatedAt: now };
    return { ...snapshot, nutritionLogs: nutrition ? snapshot.nutritionLogs.map((item) => item.id === log.id ? log : item) : [...snapshot.nutritionLogs, log] };
  }
  const workout = snapshot.workoutLogs.find((log) => log.date === date);
  const content = entry.content?.kind === "training" ? entry.content : workout;
  const log: WorkoutLog = { id: workout?.id || entry.recordId, date, weekKey: preparationPeriod(date), name: entry.title, goal: content?.goal, durationMinutes: content?.durationMinutes, exercises: structuredClone(content?.exercises || []), completedSessions: workout?.completedSessions || [], createdAt: workout?.createdAt || now, updatedAt: now };
  return { ...snapshot, workoutLogs: workout ? snapshot.workoutLogs.map((item) => item.id === log.id ? log : item) : [...snapshot.workoutLogs, log] };
}
