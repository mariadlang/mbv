import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "./planner";
import { calculateAccountBalance, calculateProjectProgress, habitRecommendation, weeklyPlanningInsight } from "./cascadeRules";

describe("cascade planning rules", () => {
  it("calculates bank balances with transfers and spending", () => {
    const snapshot = createEmptySnapshot();
    snapshot.financialAccounts = [
      { id: "a", name: "A", type: "bank", initialBalance: 1000, balanceAdjustment: 50, status: "active", createdAt: "x", updatedAt: "x" },
      { id: "b", name: "B", type: "bank", initialBalance: 0, status: "active", createdAt: "x", updatedAt: "x" },
    ];
    snapshot.transactions = [
      { id: "1", type: "income", amount: 500, date: "2026-01-01", accountId: "a", status: "active", createdAt: "x", updatedAt: "x" },
      { id: "2", type: "expense", amount: 100, date: "2026-01-02", accountId: "a", status: "active", createdAt: "x", updatedAt: "x" },
      { id: "3", type: "transfer", amount: 200, date: "2026-01-03", accountId: "a", destinationAccountId: "b", status: "active", createdAt: "x", updatedAt: "x" },
    ];
    expect(calculateAccountBalance(snapshot, "a")).toBe(1250);
    expect(calculateAccountBalance(snapshot, "b")).toBe(200);
  });

  it("combines project tasks and checklist progress", () => {
    const snapshot = createEmptySnapshot();
    snapshot.projectChecklistItems = [
      { id: "1", projectId: "p", title: "One", completed: true, createdAt: "x", updatedAt: "x" },
      { id: "2", projectId: "p", title: "Two", completed: false, createdAt: "x", updatedAt: "x" },
    ];
    snapshot.tasks = [{ id: "t", title: "Task", projectId: "p", priority: "high", status: "completed", createdAt: "x", updatedAt: "x" }];
    expect(calculateProjectProgress(snapshot, "p")).toBe(67);
  });

  it("distinguishes a habit experiment from an established habit", () => {
    expect(habitRecommendation("meditar", "experiment")).toContain("14 días");
    expect(habitRecommendation("leer", "established")).toContain("Ancla");
  });

  it("returns stable discriminants and parameters for localized weekly insights", () => {
    const emptySnapshot = createEmptySnapshot();
    const emptyInsight = weeklyPlanningInsight(emptySnapshot, new Date("2026-09-09T12:00:00"));
    expect(emptyInsight).toMatchObject({
      completed: 0,
      total: 0,
      summaryKind: "insufficient_data",
      suggestionKind: "choose_results",
    });
    expect(emptyInsight.summary).toBe("Aún no hay suficientes tareas fechadas para comparar los últimos siete días.");
    expect(emptyInsight.suggestion).toBe("Elige tres resultados posibles y agenda primero el que más alivio o avance produzca.");

    const activeSnapshot = createEmptySnapshot();
    activeSnapshot.projects = [{ id: "project-1", name: "Proyecto propio", outcome: "Resultado", status: "active", createdAt: "x", updatedAt: "x" }];
    activeSnapshot.tasks = [{ id: "task-1", title: "Paso", date: "2026-09-05", priority: "medium", status: "planned", createdAt: "x", updatedAt: "x" }];
    const activeInsight = weeklyPlanningInsight(activeSnapshot, new Date("2026-09-09T12:00:00"));
    expect(activeInsight).toMatchObject({
      completed: 0,
      total: 1,
      summaryKind: "completed",
      suggestionKind: "reduce_project",
      projectName: "Proyecto propio",
    });
    expect(activeInsight.summary).toBe("Completaste 0 de 1 tareas planificadas en los últimos siete días.");
    expect(activeInsight.suggestion).toContain("Proyecto propio");
  });

  it("uses the exact previous seven-day window and recommends a sustainable rhythm", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [
      { id: "start", title: "Inicio incluido", date: "2026-09-02", priority: "medium", status: "completed", createdAt: "x", updatedAt: "x" },
      { id: "middle-a", title: "Centro A", date: "2026-09-04", priority: "medium", status: "completed", createdAt: "x", updatedAt: "x" },
      { id: "middle-b", title: "Centro B", date: "2026-09-08", priority: "medium", status: "completed", createdAt: "x", updatedAt: "x" },
      { id: "middle-c", title: "Centro C", date: "2026-09-08", priority: "medium", status: "planned", createdAt: "x", updatedAt: "x" },
      { id: "before", title: "Fuera antes", date: "2026-09-01", priority: "medium", status: "completed", createdAt: "x", updatedAt: "x" },
      { id: "today", title: "Fuera hoy", date: "2026-09-09", priority: "medium", status: "completed", createdAt: "x", updatedAt: "x" },
    ];

    const insight = weeklyPlanningInsight(snapshot, new Date("2026-09-09T12:00:00"));
    expect(insight).toMatchObject({ completed: 3, total: 4, completionRate: 75, summaryKind: "completed", suggestionKind: "sustainable" });
    expect(insight.suggestion).toBe("El ritmo fue sostenible: conserva tus tres prioridades y deja espacio de recuperación.");
  });

  it("uses choose_results when there is evidence but no active project", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{ id: "planned", title: "Paso", date: "2026-09-08", priority: "medium", status: "planned", createdAt: "x", updatedAt: "x" }];
    expect(weeklyPlanningInsight(snapshot, new Date("2026-09-09T12:00:00"))).toMatchObject({
      total: 1,
      completionRate: 0,
      summaryKind: "completed",
      suggestionKind: "choose_results",
    });
  });
});
