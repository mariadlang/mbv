import { describe, expect, it } from "vitest";
import type { LifeArea } from "./planner";
import { averageConfirmedScore, getLifeAreaScoreState } from "./lifeAreaScores";

const timestamp = "2026-09-17T12:00:00.000Z";
const area = (overrides: Partial<LifeArea>): LifeArea => ({
  id: "area",
  name: "Salud",
  color: "sage",
  order: 0,
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

describe("life area score confirmation", () => {
  it("keeps legacy numeric values pending instead of guessing their origin", () => {
    expect(getLifeAreaScoreState(area({ currentScore: 6, desiredScore: 8 }))).toBe("pending_confirmation");
  });

  it("shows missing values as unrated", () => {
    expect(getLifeAreaScoreState(area({}))).toBe("unrated");
  });

  it("only includes explicitly confirmed scores in personal averages", () => {
    const confirmed = area({ id: "confirmed", currentScore: 8, desiredScore: 9, scoresConfirmedAt: timestamp });
    const legacy = area({ id: "legacy", currentScore: 2, desiredScore: 10 });
    expect(averageConfirmedScore([confirmed, legacy], "currentScore")).toBe(8);
    expect(averageConfirmedScore([legacy], "currentScore")).toBeNull();
  });
});
