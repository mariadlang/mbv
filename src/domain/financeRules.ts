import type { FinanceCategory, PlannerSnapshot, Transaction } from "./planner";

export const defaultFinanceCategories: { name: string; type: FinanceCategory["type"] }[] = [
  { name: "Ingresos", type: "income" }, { name: "Hogar", type: "expense" },
  { name: "Básicos", type: "expense" }, { name: "Alquiler", type: "expense" },
  { name: "Luz", type: "expense" }, { name: "Agua", type: "expense" },
  { name: "Gas", type: "expense" }, { name: "Diversión", type: "expense" },
  { name: "Lujos", type: "expense" }, { name: "Salidas", type: "expense" },
  { name: "Otros", type: "expense" }, { name: "Regalos", type: "expense" },
  { name: "Transporte", type: "expense" }, { name: "Ahorro", type: "savings" },
  { name: "Pago de deuda", type: "debt" },
];

export function mergeDefaultFinanceCategories(categories: FinanceCategory[], createId: () => string, timestamp: string) {
  const names = new Set(categories.map((category) => category.name.trim().toLocaleLowerCase("es")));
  const missing = defaultFinanceCategories.filter((category) => !names.has(category.name.toLocaleLowerCase("es")));
  return [...categories, ...missing.map((category) => ({
    id: createId(), name: category.name, type: category.type, active: true,
    createdAt: timestamp, updatedAt: timestamp,
  }))];
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function transactionsForMonth(transactions: Transaction[], monthKey: string) {
  return transactions.filter((transaction) =>
    transaction.status === "active" && transaction.date.startsWith(monthKey),
  );
}

export function calculateFinanceSummary(snapshot: PlannerSnapshot, monthKey: string) {
  const budget = snapshot.monthlyBudgets.find((item) => item.monthKey === monthKey);
  const lines = budget
    ? snapshot.budgetLines.filter((line) => line.budgetId === budget.id)
    : [];
  const monthTransactions = transactionsForMonth(snapshot.transactions, monthKey);
  const amountFor = (type: Transaction["type"]) =>
    sum(monthTransactions.filter((item) => item.type === type).map((item) => item.amount));

  const plannedByType = (type: "expense" | "savings" | "debt") =>
    sum(lines.filter((line) => snapshot.financeCategories.find((category) =>
      category.id === line.categoryId && category.type === type,
    )).map((line) => line.plannedAmount));

  const actualIncome = amountFor("income");
  const actualExpenses = amountFor("expense");
  const savingsContributions = amountFor("contribution");
  const debtPayments = amountFor("debt_payment");
  const plannedExpenses = plannedByType("expense");
  const plannedSavings = plannedByType("savings");
  const plannedDebt = plannedByType("debt");
  const plannedIncome = budget?.plannedIncome ?? 0;

  return {
    budget,
    plannedIncome,
    plannedExpenses,
    plannedSavings,
    plannedDebt,
    availableToAssign: plannedIncome - plannedExpenses - plannedSavings - plannedDebt,
    actualIncome,
    actualExpenses,
    savingsContributions,
    debtPayments,
    budgetUsed: plannedExpenses > 0 ? (actualExpenses / plannedExpenses) * 100 : null,
    savingsRate: actualIncome > 0 ? (savingsContributions / actualIncome) * 100 : null,
    periodBalance: actualIncome - actualExpenses - savingsContributions - debtPayments,
    incomplete: !budget || actualIncome === 0,
  };
}

export function calculateFundBalance(snapshot: PlannerSnapshot, fundId: string) {
  const fund = snapshot.savingsFunds.find((item) => item.id === fundId);
  if (!fund) return 0;
  const movements = snapshot.transactions.filter((item) => item.status === "active" && item.fundId === fundId);
  return fund.initialAmount
    + sum(movements.filter((item) => item.type === "contribution").map((item) => item.amount))
    - sum(movements.filter((item) => item.type === "withdrawal").map((item) => item.amount));
}

export function calculateDebtBalance(snapshot: PlannerSnapshot, debtId: string) {
  const debt = snapshot.debts.find((item) => item.id === debtId);
  if (!debt) return 0;
  const paid = sum(snapshot.transactions.filter((item) =>
    item.status === "active" && item.debtId === debtId && item.type === "debt_payment",
  ).map((item) => item.amount));
  return Math.max(0, debt.initialBalance - paid);
}
