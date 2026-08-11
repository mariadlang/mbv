import { describe, expect, it } from "vitest";
import { calculateDebtBalance, calculateFinanceSummary, calculateFundBalance } from "@/src/domain/financeRules";
import { createEmptySnapshot } from "@/src/domain/planner";

const now = "2026-08-10T12:00:00.000Z";

describe("finance rules", () => {
  it("does not count transfers or savings contributions as expenses", () => {
    const snapshot = createEmptySnapshot();
    snapshot.financeCategories = [
      { id: "expense", name: "Hogar", type: "expense", active: true, createdAt: now, updatedAt: now },
      { id: "saving", name: "Ahorro", type: "savings", active: true, createdAt: now, updatedAt: now },
      { id: "debt", name: "Deuda", type: "debt", active: true, createdAt: now, updatedAt: now },
    ];
    snapshot.monthlyBudgets = [{ id: "budget", monthKey: "2026-08", plannedIncome: 10_000, status: "active", createdAt: now, updatedAt: now }];
    snapshot.budgetLines = [
      { id: "l1", budgetId: "budget", categoryId: "expense", plannedAmount: 5_000, createdAt: now, updatedAt: now },
      { id: "l2", budgetId: "budget", categoryId: "saving", plannedAmount: 2_000, createdAt: now, updatedAt: now },
      { id: "l3", budgetId: "budget", categoryId: "debt", plannedAmount: 1_000, createdAt: now, updatedAt: now },
    ];
    snapshot.transactions = [
      { id: "t1", type: "income", amount: 10_000, date: "2026-08-01", status: "active", createdAt: now, updatedAt: now },
      { id: "t2", type: "expense", amount: 4_000, date: "2026-08-02", status: "active", createdAt: now, updatedAt: now },
      { id: "t3", type: "contribution", amount: 2_000, date: "2026-08-03", status: "active", createdAt: now, updatedAt: now },
      { id: "t4", type: "debt_payment", amount: 1_000, date: "2026-08-04", status: "active", createdAt: now, updatedAt: now },
      { id: "t5", type: "transfer", amount: 9_999, date: "2026-08-05", status: "active", createdAt: now, updatedAt: now },
    ];
    const summary = calculateFinanceSummary(snapshot, "2026-08");
    expect(summary.actualExpenses).toBe(4_000);
    expect(summary.budgetUsed).toBe(80);
    expect(summary.savingsRate).toBe(20);
    expect(summary.availableToAssign).toBe(2_000);
    expect(summary.periodBalance).toBe(3_000);
  });

  it("derives fund and debt balances from each movement exactly once", () => {
    const snapshot = createEmptySnapshot();
    snapshot.savingsFunds = [{ id: "fund", name: "Viaje", targetAmount: 10_000, initialAmount: 1_000, status: "active", createdAt: now, updatedAt: now }];
    snapshot.debts = [{ id: "debt", name: "Tarjeta", initialBalance: 8_000, status: "active", createdAt: now, updatedAt: now }];
    snapshot.transactions = [
      { id: "a", type: "contribution", amount: 2_000, fundId: "fund", date: "2026-08-01", status: "active", createdAt: now, updatedAt: now },
      { id: "b", type: "withdrawal", amount: 500, fundId: "fund", date: "2026-08-02", status: "active", createdAt: now, updatedAt: now },
      { id: "c", type: "debt_payment", amount: 1_500, debtId: "debt", date: "2026-08-03", status: "active", createdAt: now, updatedAt: now },
    ];
    expect(calculateFundBalance(snapshot, "fund")).toBe(2_500);
    expect(calculateDebtBalance(snapshot, "debt")).toBe(6_500);
  });
});
