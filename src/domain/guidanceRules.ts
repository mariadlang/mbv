import type { PlannerSnapshot, Task } from "@/src/domain/planner";

export function getDailyTopThree(tasks: Task[], date: string): Task[] {
  return tasks
    .filter((task) => task.date === date && task.status !== "cancelled" && task.focusPriority !== undefined)
    .sort((left, right) => (left.focusPriority ?? 4) - (right.focusPriority ?? 4));
}

export function applyDailyFocusPriority(
  tasks: Task[],
  taskId: string,
  date: string,
  focusPriority?: 1 | 2 | 3,
): Task[] {
  const now = new Date().toISOString();
  return tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, date, focusPriority, status: task.status === "inbox" ? "planned" : task.status, updatedAt: now };
    }
    if (
      focusPriority !== undefined
      && task.date === date
      && task.focusPriority === focusPriority
      && task.status !== "cancelled"
      && task.status !== "completed"
    ) {
      return { ...task, focusPriority: undefined, updatedAt: now };
    }
    return task;
  });
}

export function getNextStep(snapshot: PlannerSnapshot, date: string) {
  const topThree = getDailyTopThree(snapshot.tasks, date);
  const pending = topThree.find((task) => task.status !== "completed");
  if (pending) return { title: pending.title, href: "/app/today" };

  const activeGoalIds = new Set(snapshot.goals.filter((goal) => goal.status === "active").map((goal) => goal.id));
  const goalTask = snapshot.tasks.find((task) => task.goalId && activeGoalIds.has(task.goalId) && task.status !== "completed" && task.status !== "cancelled");
  if (goalTask) return { title: goalTask.title, href: "/app/goals" };
  const nextMilestone = snapshot.milestones.find((milestone) => activeGoalIds.has(milestone.goalId) && milestone.status !== "completed");
  if (nextMilestone) return { title: nextMilestone.title, href: "/app/goals" };

  const activeProjectIds = new Set(snapshot.projects.filter((project) => project.status === "active").map((project) => project.id));
  const projectTask = snapshot.tasks.find((task) => task.projectId && activeProjectIds.has(task.projectId) && task.status !== "completed" && task.status !== "cancelled");
  if (projectTask) return { title: projectTask.title, href: "/app/tasks" };

  const urgent = snapshot.tasks.find((task) => task.date && task.date <= date && task.status !== "completed" && task.status !== "cancelled");
  if (urgent) return { title: urgent.title, href: "/app/tasks" };

  if (!snapshot.lifeAreas.some((area) => area.vision || area.dream)) return { title: "Define una dirección en tu Vida soñada", href: "/app/vision" };
  if (!snapshot.goals.some((goal) => goal.status === "active")) return { title: "Convierte tu visión en una meta", href: "/app/goals" };
  if (!snapshot.moodLogs.some((log) => log.date === date)) return { title: "Registra cómo llegas a este día", href: "/app/habits?checkin=1" };
  return topThree.length ? { title: "Reconoce lo que ya completaste", href: "/app/progress" } : { title: "Elige una prioridad concreta para hoy", href: "/app/today" };
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
