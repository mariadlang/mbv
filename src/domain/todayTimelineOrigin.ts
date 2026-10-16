import { monthlyPriorityForTask } from "./monthlyPrioritySteps";
import type { CascadePlan, Task } from "./planner";

/**
 * Returns the concrete monthly priority explicitly linked to a task.
 *
 * Older monthly tasks may only carry a plan link. Inferring a priority from the
 * plan intention, its first objective or the task title would turn unrelated
 * copy into provenance, so those tasks intentionally remain without a monthly
 * priority label.
 */
export function resolveTaskMonthlyPriority(plans: CascadePlan[], task: Task): string | undefined {
  if (!task.periodPlanId) return undefined;

  const plan = plans.find((candidate) => candidate.id === task.periodPlanId && candidate.horizon === "monthly");
  const priority = plan ? monthlyPriorityForTask(plan, task)?.trim() : undefined;
  return priority || undefined;
}
