import type { PlannerSnapshot, Task } from "@/src/domain/planner";

export function getDailyTopThree(tasks: Task[], date: string): Task[] {
  return tasks
    .filter((task) => task.date === date && task.status !== "cancelled" && task.focusPriority !== undefined)
    .sort((left, right) => (left.focusPriority ?? 4) - (right.focusPriority ?? 4));
}

export function getNextStep(snapshot: PlannerSnapshot, date: string) {
  const topThree = getDailyTopThree(snapshot.tasks, date);
  if (!topThree.length) return { title: "Elige tus tres prioridades", href: "/app/today" };
  if (!snapshot.moodLogs.some((log) => log.date === date)) return { title: "Registra cómo llegas a este día", href: "/app/habits" };
  const pending = topThree.find((task) => task.status !== "completed");
  return pending ? { title: pending.title, href: "/app/today" } : { title: "Reconoce lo que ya completaste", href: "/app/progress" };
}

export function resistanceSuggestion(reason: "too_big" | "unclear" | "no_time" | "avoidance" | "perfectionism") {
  return {
    too_big: "Reduce el resultado a una versión que puedas terminar en 20 minutos.",
    unclear: "Escribe el primer verbo y define qué debe quedar visible al terminar.",
    no_time: "Reserva diez minutos y reduce el alcance antes de moverla otra vez.",
    avoidance: "Decide con honestidad si puedes eliminarla, delegarla o cambiar su formato.",
    perfectionism: "Define antes de empezar qué significa suficientemente bien.",
  }[reason];
}
