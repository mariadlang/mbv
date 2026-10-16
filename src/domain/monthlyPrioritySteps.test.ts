import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "./planner";
import { applyMonthlyPriorityStep, monthlyPriorityCandidates, monthlyPriorityForTask } from "./monthlyPrioritySteps";

const context = { id: () => "step-one", now: "2026-10-03T12:00:00Z" };
function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.cascadePlans = [{ id: "october", horizon: "monthly", periodKey: "2026-10", priority: "", intention: "Leer con calma", objectives: ["Terminar un libro"], activities: [], details: { "health.v1.nutrition.2026-10-03": "preserved" }, createdAt: "original", updatedAt: "original" }];
  return snapshot;
}
const input = { planId: "october", priority: "Terminar un libro", actionKey: "one", title: "Leer capítulos 3 y 4", date: "2026-09-30", time: "20:00" };

describe("monthly priority steps", () => {
  it("connects a concrete step across a month boundary without completing its objective", () => {
    const saved = applyMonthlyPriorityStep(fixture(), input, context);
    expect(saved.tasks[0]).toMatchObject({ id: "step-one", periodPlanId: "october", planActionKey: "one", date: "2026-09-30", time: "20:00", status: "planned" });
    expect(monthlyPriorityForTask(saved.cascadePlans[0], saved.tasks[0])).toBe("Terminar un libro");
    expect(saved.cascadePlans[0].completedObjectiveIndexes).toBeUndefined();
    expect(saved.cascadePlans[0].details?.["health.v1.nutrition.2026-10-03"]).toBe("preserved");
  });
  it("is idempotent and preserves ID, action key and completion history when edited", () => {
    const first = applyMonthlyPriorityStep(fixture(), input, context);
    first.tasks[0] = { ...first.tasks[0], status: "completed", completedAt: "2026-10-01", estimatedMinutes: 30 };
    const edited = applyMonthlyPriorityStep(first, { ...input, title: "Leer capítulos 4 y 5", taskId: "step-one" }, context);
    const retry = applyMonthlyPriorityStep(edited, input, context);
    expect(retry.tasks).toHaveLength(1);
    expect(retry.tasks[0]).toMatchObject({ id: "step-one", status: "completed", completedAt: "2026-10-01", estimatedMinutes: 30, createdAt: context.now });
    expect(retry.cascadePlans[0].completedObjectiveIndexes).toBeUndefined();
  });
  it("requires confirmation to move scheduled tasks and never clones them", () => {
    const first = applyMonthlyPriorityStep(fixture(), input, context);
    expect(() => applyMonthlyPriorityStep(first, { ...input, taskId: "step-one", date: "2026-10-02" }, context)).toThrow("MONTHLY_STEP_MOVE_CONFIRMATION_REQUIRED");
    const moved = applyMonthlyPriorityStep(first, { ...input, taskId: "step-one", date: "2026-10-02", confirmMove: true }, context);
    expect(moved.tasks).toHaveLength(1);
    expect(moved.tasks[0]).toMatchObject({ id: "step-one", date: "2026-10-02", periodPlanId: "october" });
  });
  it("accepts independent actions without requiring a monthly plan or goal", () => {
    const saved = applyMonthlyPriorityStep(createEmptySnapshot(), { actionKey: "free", title: "Dar un paseo", date: "2026-10-03" }, context);
    expect(saved.tasks[0].periodPlanId).toBeUndefined();
    expect(saved.tasks[0].goalId).toBeUndefined();
    expect(saved.cascadePlans).toHaveLength(0);
  });
  it("rejects foreign tasks, missing priorities and invalid dates", () => {
    const first = applyMonthlyPriorityStep(fixture(), input, context);
    expect(() => applyMonthlyPriorityStep(first, { ...input, taskId: "step-one", planId: undefined }, context)).toThrow("MONTHLY_STEP_PLAN_MISMATCH");
    expect(() => applyMonthlyPriorityStep(first, { ...input, priority: "No existe" }, context)).toThrow("MONTHLY_PRIORITY_NOT_FOUND");
    expect(() => applyMonthlyPriorityStep(first, { ...input, date: "2026-02-30" }, context)).toThrow();
  });
  it("keeps historical links after the monthly priority wording changes", () => {
    const first = applyMonthlyPriorityStep(fixture(), input, context);
    first.cascadePlans[0].objectives = ["Leer dos libros"];
    const edited = applyMonthlyPriorityStep(first, { ...input, taskId: "step-one", title: "Terminar el capítulo" }, context);
    expect(monthlyPriorityForTask(edited.cascadePlans[0], edited.tasks[0])).toBe(input.priority);
    expect(monthlyPriorityCandidates(edited, edited.cascadePlans[0], input.priority)).toHaveLength(1);
  });
});
