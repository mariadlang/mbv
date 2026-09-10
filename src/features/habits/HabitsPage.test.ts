import { describe, expect, it } from "vitest";
import { getHabitConsistencyDayPresentation } from "./HabitsPage";

describe("habit consistency day presentation", () => {
  it("keeps an unscheduled day distinct from a scheduled zero", () => {
    expect(getHabitConsistencyDayPresentation(null)).toEqual({
      isScheduled: false,
      height: 0,
    });
    expect(getHabitConsistencyDayPresentation(0)).toEqual({
      isScheduled: true,
      height: 3,
    });
  });
});
