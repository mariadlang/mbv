import type { GoalProgressType, PlannerSnapshot } from "./planner";

export const goalProgressSource: Record<GoalProgressType, string> = {
  milestones: "Hitos completados",
  numeric: "Valor actual frente al objetivo",
  tasks: "Tareas vinculadas completadas",
  manual: "Avance registrado manualmente",
};

export type ProgressAchievement = {
  id: "first-task" | "first-habit" | "connected-action" | "intentional-week";
  title: string;
  description: string;
  condition: string;
};

export function buildProgressEvidence(snapshot: PlannerSnapshot) {
  const completedTasks = snapshot.tasks.filter((task) => task.status === "completed");
  const completedHabitLogs = snapshot.habitLogs.filter((log) => log.value > 0);
  const connectedTasks = completedTasks.filter((task) => task.goalId && (task.periodPlanId || task.projectId));
  const activeDates = new Set([
    ...completedTasks.map((task) => task.completedAt?.slice(0, 10) || task.date).filter(Boolean),
    ...completedHabitLogs.map((log) => log.date),
  ]);
  const achievements: ProgressAchievement[] = [];

  if (completedTasks.length > 0) achievements.push({
    id: "first-task",
    title: "Tu primera acción completada",
    description: "Terminaste una tarea y ya existe una primera evidencia real de avance.",
    condition: "Se activa al completar al menos una tarea.",
  });
  if (completedHabitLogs.length > 0) achievements.push({
    id: "first-habit",
    title: "Un hábito que ya dejó huella",
    description: "Registraste un hábito programado. Ese dato ya forma parte de tu historia.",
    condition: "Se activa al registrar al menos un hábito con valor positivo.",
  });
  if (connectedTasks.length > 0) achievements.push({
    id: "connected-action",
    title: "Una meta convertida en acción",
    description: "Completaste una tarea conectada con una meta y con un plan o proyecto.",
    condition: "Se activa al completar una tarea vinculada a una meta y a un plan o proyecto.",
  });
  if (activeDates.size >= 3 && completedTasks.length > 0 && completedHabitLogs.length > 0) achievements.push({
    id: "intentional-week",
    title: "Tu primera semana con intención",
    description: "Tus tareas y hábitos muestran actividad real en al menos tres días distintos.",
    condition: "Se activa con tareas completadas y hábitos registrados en tres días distintos.",
  });

  return {
    completedTasks: completedTasks.length,
    completedHabitLogs: completedHabitLogs.length,
    completedMilestones: snapshot.milestones.filter((milestone) => milestone.status === "completed").length,
    achievements,
    latestAchievement: achievements.at(-1),
  };
}
