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
  achievedAt: string;
};

function earliest(values: string[]): string {
  return [...values].sort((left, right) => left.localeCompare(right))[0] ?? "";
}

function latestDateKey(values: string[]): string {
  return values.filter(Boolean).map((value) => value.slice(0, 10)).sort((left, right) => left.localeCompare(right)).at(-1) ?? "";
}

export function buildProgressEvidence(snapshot: PlannerSnapshot) {
  const completedTasks = snapshot.tasks.filter((task) => task.status === "completed");
  const completedHabitLogs = snapshot.habitLogs.filter((log) => log.value > 0);
  const connectedTasks = completedTasks.filter((task) => task.goalId && (task.periodPlanId || task.projectId));
  const activeDates = new Set<string>([
    ...completedTasks.map((task) => task.completedAt?.slice(0, 10) || task.date).filter(Boolean),
    ...completedHabitLogs.map((log) => log.date),
  ].filter((date): date is string => Boolean(date)));
  const achievements: ProgressAchievement[] = [];
  const firstTaskAt = earliest(completedTasks.map((task) => task.completedAt || task.date || task.updatedAt || task.createdAt));
  const firstHabitAt = earliest(completedHabitLogs.map((log) => log.date || log.updatedAt || log.createdAt));
  const connectedActionAt = earliest(connectedTasks.map((task) => task.completedAt || task.date || task.updatedAt || task.createdAt));
  const thirdActiveDate = [...activeDates].sort((left, right) => left.localeCompare(right))[2] ?? "";
  const intentionalDaysAt = latestDateKey([thirdActiveDate, firstTaskAt, firstHabitAt]);

  if (completedTasks.length > 0) achievements.push({
    id: "first-task",
    title: "Tu primera acción completada",
    description: "Terminaste una tarea y ya existe una primera evidencia real de avance.",
    condition: "Se activa al completar al menos una tarea.",
    achievedAt: firstTaskAt,
  });
  if (completedHabitLogs.length > 0) achievements.push({
    id: "first-habit",
    title: "Un hábito que ya dejó huella",
    description: "Registraste un hábito programado. Ese dato ya forma parte de tu historia.",
    condition: "Se activa al registrar al menos un hábito con valor positivo.",
    achievedAt: firstHabitAt,
  });
  if (connectedTasks.length > 0) achievements.push({
    id: "connected-action",
    title: "Una meta convertida en acción",
    description: "Completaste una tarea conectada con una meta y con un plan o proyecto.",
    condition: "Se activa al completar una tarea vinculada a una meta y a un plan o proyecto.",
    achievedAt: connectedActionAt,
  });
  if (activeDates.size >= 3 && completedTasks.length > 0 && completedHabitLogs.length > 0) achievements.push({
    id: "intentional-week",
    title: "Tres días con intención",
    description: "Tus tareas y hábitos muestran actividad real en tres días distintos, sin exigir que sean consecutivos.",
    condition: "Se activa con tareas completadas y hábitos registrados en tres días distintos.",
    achievedAt: intentionalDaysAt,
  });

  const latestAchievement = achievements.reduce<ProgressAchievement | undefined>((latest, achievement) => {
    if (!latest || achievement.achievedAt.localeCompare(latest.achievedAt) >= 0) return achievement;
    return latest;
  }, undefined);

  return {
    completedTasks: completedTasks.length,
    completedHabitLogs: completedHabitLogs.length,
    completedMilestones: snapshot.milestones.filter((milestone) => milestone.status === "completed").length,
    achievements,
    latestAchievement,
  };
}
