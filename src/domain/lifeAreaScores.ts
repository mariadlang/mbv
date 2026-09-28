import type { LifeArea } from "./planner";

export type LifeAreaScoreState = "confirmed" | "pending_confirmation" | "unrated";

export function getLifeAreaScoreState(area: LifeArea): LifeAreaScoreState {
  if (area.scoresConfirmedAt && typeof area.currentScore === "number" && typeof area.desiredScore === "number") return "confirmed";
  if (typeof area.currentScore === "number" || typeof area.desiredScore === "number") return "pending_confirmation";
  return "unrated";
}

export function getConfirmedLifeAreaScores(areas: LifeArea[]) {
  return areas.filter((area) => area.active && getLifeAreaScoreState(area) === "confirmed");
}

export function averageConfirmedScore(areas: LifeArea[], field: "currentScore" | "desiredScore"): number | null {
  const values = getConfirmedLifeAreaScores(areas)
    .map((area) => area[field])
    .filter((value): value is number => typeof value === "number");
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
