import { z } from "zod";
import type { PlannerSnapshot } from "./planner";
import { isValidCalendarDateKey } from "./calendar";
import { getReviewPeriodKey } from "@/src/lib/dates";

export const preparationKeys = ["nutrition", "training", "habits", "priorities", "agenda"] as const;
export const preparationItemSchema = z.object({ id: z.string().min(1).max(80), label: z.string().trim().max(100).optional() });
export const preparationPreferencesSchema = z.array(preparationItemSchema).max(20).refine((items) => new Set(items.map((item) => item.id)).size === items.length);
export const preparationPatchSchema = z.object({
  week: z.string().refine(isValidCalendarDateKey),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  review: z.enum(["skipped", "reviewed"]).optional(),
  item: z.string().min(1).max(80).optional(),
  state: z.enum(["ready", "pending", "excluded"]).optional(),
}).refine((value) => Boolean(value.review || value.month || (value.item && value.state)));
export type PreparationPatch = z.infer<typeof preparationPatchSchema>;
export const preparationNamespace = "preparation.v1.";
export const preparationPeriod = (week: string) => getReviewPeriodKey("weekly", new Date(`${week}T12:00:00`), 1);

export function weekPreparation(snapshot: PlannerSnapshot, week: string, fixedSteps = false) {
  const plan = snapshot.cascadePlans.find((item) => item.horizon === "weekly" && item.periodKey === preparationPeriod(week));
  const details = plan?.details ?? {};
  const items: { id: string; label?: string }[] = (fixedSteps ? undefined : snapshot.profile?.preparationItems) ?? preparationKeys.map((id) => ({ id }));
  const end = new Date(`${week}T12:00:00`);
  end.setDate(end.getDate() + 6);
  const last = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  const inWeek = (date?: string) => Boolean(date && date >= week && date <= last);
  const tasks = snapshot.tasks.filter((task) => task.status !== "cancelled" && inWeek(task.date));
  const hasContent: Record<string, boolean> = {
    nutrition: snapshot.nutritionLogs.some((log) => inWeek(log.date) && log.meals.length > 0),
    training: snapshot.workoutLogs.some((log) => inWeek(log.date) && Boolean(log.name || log.exercises.length)),
    habits: snapshot.habits.some((habit) => habit.status === "active" && (habit.oneOffDate ? inWeek(habit.oneOffDate) : habit.scheduledDays.length > 0)),
    priorities: tasks.some((task) => task.priority === "high") || Boolean(plan?.objectives.length),
    agenda: tasks.length > 0 || snapshot.events.some((event) => inWeek(event.startDate)),
  };
  const rows = items.map((item) => {
    const saved = details[`${preparationNamespace}item.${item.id}`];
    const state = saved === "excluded" ? "excluded" : saved === "ready" ? "ready" : hasContent[item.id] ? "progress" : "pending";
    return { ...item, state };
  });
  const active = rows.filter((item) => item.state !== "excluded");
  const ready = active.filter((item) => item.state === "ready").length;
  return { rows, active, ready, percent: active.length ? Math.round(ready / active.length * 100) : 0, review: details[`${preparationNamespace}review`], month: details[`${preparationNamespace}month`] || week.slice(0, 7) };
}
