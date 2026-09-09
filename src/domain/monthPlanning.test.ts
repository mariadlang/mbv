import { describe, expect, it } from "vitest";
import type { CascadePlan, PlannerEvent, Task } from "@/src/domain/planner";
import { buildYearMonthSlots, collectMonthPlanEntries, monthPeriodKey, parseAreaGoals, serializeAreaGoals } from "./monthPlanning";

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

  it("preserves historical plan activities when deriving monthly actions and events", () => {
    const monthlyPlan = {
      ...plan("2026-12"),
      activities: [
        { id: "historical-action", title: "Preparar cierre", date: "2026-12-08", type: "activity" as const },
        { id: "linked-copy", title: " reservar cita ", date: "2026-12-09", type: "activity" as const },
        { id: "historical-event", title: "Cena de cierre", date: "2026-12-20", type: "event" as const },
        { id: "calendar-copy", title: " consulta ", date: "2026-12-11", type: "event" as const },
      ],
    };
    const linkedTask: Task = {
      id: "linked-task",
      title: "Reservar cita",
      periodPlanId: monthlyPlan.id,
      date: "2026-12-09",
      priority: "medium",
      status: "planned",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const calendarEvent: PlannerEvent = {
      id: "calendar-event",
      title: "Consulta",
      startDate: "2026-12-11",
      category: "medical",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(collectMonthPlanEntries(monthlyPlan, [linkedTask], [calendarEvent])).toEqual({
      actions: [
        { id: "linked-task", title: "Reservar cita", date: "2026-12-09" },
        { id: "historical-action", title: "Preparar cierre", date: "2026-12-08" },
      ],
      events: [
        { id: "calendar-event", title: "Consulta", date: "2026-12-11" },
        { id: "historical-event", title: "Cena de cierre", date: "2026-12-20" },
      ],
    });
  });
});
