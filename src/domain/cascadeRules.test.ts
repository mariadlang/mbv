import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "./planner";
import { calculateAccountBalance, calculateProjectProgress, habitRecommendation } from "./cascadeRules";

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
});
