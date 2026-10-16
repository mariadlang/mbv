import { z } from "zod";
import type { CascadePlan, PlannerSnapshot, Task } from "./planner";
import { isValidCalendarDateKey } from "./calendar";

export const monthlyPriorityStepSchema = z.object({
  taskId: z.string().min(1).optional(),
  actionKey: z.string().min(1),
  planId: z.string().min(1).optional(),
  priority: z.string().trim().min(1).optional(),
  title: z.string().trim().min(2).max(300),
  date: z.string().refine(isValidCalendarDateKey),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  confirmMove: z.boolean().default(false),
});
export type MonthlyPriorityStepInput = z.input<typeof monthlyPriorityStepSchema>;
export const priorityTaskDetailKey = (taskId: string) => `preparation.v1.priorityTask.${taskId}`;

/** Existing plan and action keys remain canonical. The priority label is contextual
 * metadata, not an objective completion or a second task record. */
export function monthlyPriorityForTask(plan: CascadePlan, task: Task) {
  return plan.details?.[priorityTaskDetailKey(task.id)];
}

export function monthlyPriorityCandidates(snapshot: PlannerSnapshot, plan: CascadePlan, priority?: string) {
  return snapshot.tasks.filter((task) => task.periodPlanId === plan.id && task.status !== "cancelled"
    && (!priority || !monthlyPriorityForTask(plan, task) || monthlyPriorityForTask(plan, task) === priority));
}

export function applyMonthlyPriorityStep(snapshot: PlannerSnapshot, input: MonthlyPriorityStepInput, context: { id: () => string; now: string }): PlannerSnapshot {
  const value = monthlyPriorityStepSchema.parse(input);
  const plan = value.planId ? snapshot.cascadePlans.find((candidate) => candidate.id === value.planId && candidate.horizon === "monthly") : undefined;
  if (value.planId && !plan) throw new Error("MONTHLY_PLAN_NOT_FOUND");
  const existing = value.taskId ? snapshot.tasks.find((task) => task.id === value.taskId)
    : snapshot.tasks.find((task) => task.planActionKey === value.actionKey && task.periodPlanId === value.planId);
  if (value.taskId && !existing) throw new Error("MONTHLY_STEP_NOT_FOUND");
  if (existing && existing.periodPlanId !== value.planId) throw new Error("MONTHLY_STEP_PLAN_MISMATCH");
  if (existing?.status === "cancelled") throw new Error("MONTHLY_STEP_CANCELLED");
  // A renamed/removed monthly objective does not erase a historical task link.
  const previousPriority = plan && existing ? monthlyPriorityForTask(plan, existing) : undefined;
  if (value.priority && (!plan || (!plan.objectives.slice(0, 3).includes(value.priority) && previousPriority !== value.priority))) throw new Error("MONTHLY_PRIORITY_NOT_FOUND");
  if (existing?.date && existing.date !== value.date && !value.confirmMove) throw new Error("MONTHLY_STEP_MOVE_CONFIRMATION_REQUIRED");
  const taskId = existing?.id ?? context.id();
  const task: Task = {
    ...existing,
    id: taskId,
    title: value.title,
    date: value.date,
    time: value.time,
    priority: existing?.priority ?? (value.priority ? "high" : "medium"),
    periodPlanId: value.planId,
    planActionKey: existing?.planActionKey ?? value.actionKey,
    // Completion is explicit elsewhere; scheduling never fulfils an objective.
    status: existing?.status === "completed" || existing?.status === "in_progress" ? existing.status : "planned",
    createdAt: existing?.createdAt ?? context.now,
    updatedAt: context.now,
  };
  if (existing?.date !== value.date && task.focusPriority) task.focusPriority = undefined;
  return {
    ...snapshot,
    tasks: existing ? snapshot.tasks.map((item) => item.id === taskId ? task : item) : [...snapshot.tasks, task],
    cascadePlans: plan ? snapshot.cascadePlans.map((item) => {
      if (item.id !== plan.id) return item;
      const details = { ...item.details };
      if (value.priority) details[priorityTaskDetailKey(taskId)] = value.priority;
      return { ...item, details, updatedAt: context.now };
    }) : snapshot.cascadePlans,
  };
}
