import { describe, expect, it } from "vitest";
import { getReviewPeriodKey, getWeekDates, toLocalDateKey } from "@/src/lib/dates";

describe("local date utilities", () => {
  const date = new Date(2026, 7, 16, 12, 0, 0);

  it.each([
    ["daily", "2026-08-16"],
    ["weekly", "2026-W33"],
    ["monthly", "2026-08"],
    ["quarterly", "2026-Q3"],
    ["annual", "2026"],
  ] as const)("creates the %s review period key", (type, expected) => {
    expect(getReviewPeriodKey(type, date, 1)).toBe(expected);
  });

  it("uses the configured first day of the week", () => {
    expect(getWeekDates(date, 1).map(toLocalDateKey)).toEqual([
      "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13",
      "2026-08-14", "2026-08-15", "2026-08-16",
    ]);
    expect(getWeekDates(date, 0).map(toLocalDateKey)[0]).toBe("2026-08-16");
  });
});
