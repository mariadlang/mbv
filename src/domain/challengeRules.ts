import type { Challenge } from "@/src/domain/planner";

export interface ChallengeProgress {
  completed: number;
  planned?: number;
  percentage?: number;
}

export function calculateChallengeProgress(
  challenge: Pick<Challenge, "completedDates">,
  plannedDays?: number,
): ChallengeProgress {
  const completed = new Set(challenge.completedDates).size;
  if (!plannedDays || plannedDays < 1) return { completed };
  return {
    completed,
    planned: plannedDays,
    percentage: Math.min(100, Math.round((completed / plannedDays) * 100)),
  };
}

export function challengeEncouragement(completed: number, completedToday: boolean): string {
  if (completedToday) return "Hoy ya hiciste espacio para este reto.";
  if (completed === 0) return "El primer paso puede ser pequeño y aun así contar.";
  return "Puedes retomarlo hoy o volver cuando se sienta posible.";
}

