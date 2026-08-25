import { describe, expect, it } from "vitest";
import type { CascadePlan } from "@/src/domain/planner";
import { buildYearMonthSlots, monthPeriodKey, parseAreaGoals, serializeAreaGoals } from "./monthPlanning";

const plan = (periodKey: string): CascadePlan => ({
  id: `plan-${periodKey}`,
  horizon: "monthly",
  periodKey,
  intention: "Avanzar con calma",
  priority: "",
  objectives: [],
  activities: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("annual month planning", () => {
  it("always creates twelve chronological UI slots without creating empty records", () => {
    const existing = plan("2026-09");
    const slots = buildYearMonthSlots(2026, [existing], new Date("2026-08-24T12:00:00"));

    expect(slots).toHaveLength(12);
    expect(slots.map((slot) => slot.periodKey)).toEqual(
      Array.from({ length: 12 }, (_, index) => monthPeriodKey(2026, index)),
    );
    expect(slots.filter((slot) => slot.plan)).toEqual([expect.objectContaining({ plan: existing })]);
    expect(slots[7].isCurrent).toBe(true);
  });

  it("does not mark a current month while another year is selected", () => {
    expect(buildYearMonthSlots(2025, [], new Date("2026-08-24T12:00:00")).some((slot) => slot.isCurrent)).toBe(false);
  });

  it("round-trips populated area goals and safely ignores invalid legacy values", () => {
    const encoded = serializeAreaGoals({ health: "Entrenar tres veces", finance: "  " });
    expect(parseAreaGoals(encoded)).toEqual({ health: "Entrenar tres veces" });
    expect(parseAreaGoals("not-json")).toEqual({});
  });
});
