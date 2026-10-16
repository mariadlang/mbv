import { describe, expect, it } from "vitest";
import type { CascadePlan, Task } from "./planner";
import { resolveTaskMonthlyPriority } from "./todayTimelineOrigin";

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "monthly-step",
  title: "Preparar el primer borrador",
  priority: "medium",
  status: "planned",
  createdAt: "2026-10-05T12:00:00Z",
  updatedAt: "2026-10-05T12:00:00Z",
  ...overrides,
});

const monthlyPlan = (overrides: Partial<CascadePlan> = {}): CascadePlan => ({
  id: "october",
  horizon: "monthly",
  periodKey: "2026-10",
  intention: "Avanzar con calma",
  priority: "Una intención genérica",
  objectives: ["Publicar el borrador"],
  activities: [],
  createdAt: "2026-10-01T12:00:00Z",
  updatedAt: "2026-10-01T12:00:00Z",
  ...overrides,
});

describe("today timeline monthly origin", () => {
  it("returns the precise priority stored for the linked monthly step", () => {
    const linkedTask = task({ periodPlanId: "october" });
    const plan = monthlyPlan({
      details: { "preparation.v1.priorityTask.monthly-step": "Publicar el borrador" },
    });

    expect(resolveTaskMonthlyPriority([plan], linkedTask)).toBe("Publicar el borrador");
  });

  it("does not invent a priority for independent or legacy tasks", () => {
    const plan = monthlyPlan({
      details: { "preparation.v1.priorityTask.monthly-step": "Publicar el borrador" },
    });

    expect(resolveTaskMonthlyPriority([plan], task())).toBeUndefined();
    expect(resolveTaskMonthlyPriority([monthlyPlan()], task({ periodPlanId: "october" }))).toBeUndefined();
  });

  it("keeps the historical linked priority when the current objective was renamed", () => {
    const linkedTask = task({ periodPlanId: "october" });
    const plan = monthlyPlan({
      objectives: ["Publicar la versión final"],
      details: { "preparation.v1.priorityTask.monthly-step": "Publicar el borrador" },
    });

    expect(resolveTaskMonthlyPriority([plan], linkedTask)).toBe("Publicar el borrador");
  });

  it("preserves the precise origin for a completed monthly step", () => {
    const completedTask = task({ periodPlanId: "october", status: "completed", completedAt: "2026-10-05T14:00:00Z" });
    const plan = monthlyPlan({
      details: { "preparation.v1.priorityTask.monthly-step": "Publicar el borrador" },
    });

    expect(resolveTaskMonthlyPriority([plan], completedTask)).toBe("Publicar el borrador");
  });
});
