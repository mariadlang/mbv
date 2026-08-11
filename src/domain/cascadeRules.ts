import type { PlannerSnapshot } from "./planner";

export function calculateAccountBalance(snapshot: PlannerSnapshot, accountId: string): number {
  const account = snapshot.financialAccounts.find((item) => item.id === accountId);
  if (!account) return 0;
  return snapshot.transactions
    .filter((transaction) => transaction.status === "active")
    .reduce((balance, transaction) => {
      if (transaction.type === "transfer") {
        if (transaction.accountId === accountId) balance -= transaction.amount;
        if (transaction.destinationAccountId === accountId) balance += transaction.amount;
        return balance;
      }
      if (transaction.accountId !== accountId) return balance;
      return transaction.type === "income"
        ? balance + transaction.amount
        : balance - transaction.amount;
    }, account.initialBalance);
}

export function calculateProjectProgress(snapshot: PlannerSnapshot, projectId: string): number {
  const checks = snapshot.projectChecklistItems.filter((item) => item.projectId === projectId);
  const tasks = snapshot.tasks.filter((item) => item.projectId === projectId && item.status !== "cancelled");
  const total = checks.length + tasks.length;
  if (!total) return 0;
  const completed = checks.filter((item) => item.completed).length
    + tasks.filter((item) => item.status === "completed").length;
  return Math.round((completed / total) * 100);
}

export function projectNextSuggestion(snapshot: PlannerSnapshot, projectId: string): string {
  const nextCheck = snapshot.projectChecklistItems.find(
    (item) => item.projectId === projectId && !item.completed,
  );
  const nextTask = snapshot.tasks
    .filter((item) => item.projectId === projectId && item.status !== "completed" && item.status !== "cancelled")
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))[0];
  const next = nextCheck?.title ?? nextTask?.title;
  return next
    ? `Tu siguiente paso más pequeño es: ${next}. Reserva un bloque concreto esta semana.`
    : "Define una acción de menos de 30 minutos para volver a poner este proyecto en movimiento.";
}

export function habitRecommendation(name: string, origin: "established" | "experiment"): string {
  if (origin === "experiment") {
    return `Prueba “${name}” durante 14 días, con una versión tan pequeña que puedas repetirla incluso en un día difícil.`;
  }
  return `Ancla “${name}” a una señal que ya exista en tu día y deja preparado lo que necesitas la noche anterior.`;
}

export function weeklyPlanningInsight(snapshot: PlannerSnapshot, today = new Date()): {
  completionRate: number;
  summary: string;
  suggestion: string;
} {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const relevant = snapshot.tasks.filter((task) => {
    if (!task.date) return false;
    const date = new Date(`${task.date}T00:00:00`);
    return date >= start && date < end && task.status !== "cancelled";
  });
  const completed = relevant.filter((task) => task.status === "completed").length;
  const completionRate = relevant.length ? Math.round((completed / relevant.length) * 100) : 0;
  const project = snapshot.projects.find((item) => item.status === "active");
  return {
    completionRate,
    summary: relevant.length
      ? `Completaste ${completed} de ${relevant.length} tareas planificadas la semana pasada.`
      : "Aún no hay suficientes tareas fechadas para comparar la semana anterior.",
    suggestion: completionRate >= 75
      ? "El ritmo fue sostenible: conserva tus tres prioridades y deja espacio de recuperación."
      : project
        ? `Reduce el alcance y protege primero un paso del proyecto “${project.name}”.`
        : "Elige tres resultados posibles y agenda primero el que más alivio o avance produzca.",
  };
}

export function monthlyBrainDumpSummary(snapshot: PlannerSnapshot, monthKey: string): {
  captured: number;
  pending: number;
  message: string;
} {
  const items = snapshot.brainDumpItems.filter((item) => {
    const date = item.tentativeDate ?? item.createdAt.slice(0, 10);
    return date.startsWith(monthKey);
  });
  const pending = items.filter((item) => item.status === "idea" || item.status === "planned").length;
  return {
    captured: items.length,
    pending,
    message: pending
      ? `Quedaron ${pending} ideas abiertas. Llévalas al próximo mes solo si todavía apoyan tus prioridades.`
      : "Todo lo capturado este mes ya fue completado o liberado.",
  };
}
