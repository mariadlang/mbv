// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { UserAccess } from "@/src/domain/access";
import { createEmptySnapshot, type PlannerSnapshot, type Task } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { useUiStore } from "@/src/stores/useUiStore";
import { WeeklyPlanView } from "./WeeklyPlanView";

vi.mock("@/src/hooks/useCalendarIntegration", () => ({
  useCalendarIntegration: () => ({ events: [], snapshot: { calendars: [] }, connected: false }),
}));
vi.mock("@/src/services/analyticsService", () => ({ analyticsService: { track: vi.fn() } }));

const access: UserAccess = {
  userId: "weekly-unit-user", email: "weekly-unit@example.com", displayName: "Persona de prueba", role: "user",
  accessStatus: "free", subscriptionStatus: "none", trialStartedAt: null, trialEndsAt: null,
  serverNow: "2026-10-05T20:00:00Z", eligibilityStatus: "tracking", planInterval: null, premiumSource: null,
  campaignKey: null, currentStreakDays: 0, eligibleAt: null, currentPeriodStartsAt: null,
  currentPeriodEndsAt: null, nextPaymentAt: null, cancelAtPeriodEnd: false,
};
const stamp = "2026-10-05T20:00:00Z";
const task = (id: string, date = "2026-10-05", time?: string, estimatedMinutes?: number): Task => ({
  id, title: id, date, time, estimatedMinutes, priority: "medium", status: "planned", createdAt: stamp, updatedAt: stamp,
});

function renderWeek(snapshot: PlannerSnapshot, anchorDate = new Date("2026-10-05T12:00:00")) {
  const onEditTask = vi.fn();
  const updateTask = vi.fn().mockResolvedValue(snapshot);
  const toggleTask = vi.fn().mockResolvedValue(snapshot);
  const planner = { snapshot, saving: false, updateTask, toggleTask } as unknown as PlannerController;
  const view = render(<I18nProvider><MemoryRouter initialEntries={["/app/planning/weekly"]}>
    <WeeklyPlanView planner={planner} access={access} anchorDate={anchorDate} todayKey="2026-10-05" onAnchorDateChange={vi.fn()} onBack={vi.fn()} onEditTask={onEditTask} onQuickCapture={vi.fn()} />
  </MemoryRouter></I18nProvider>);
  return { ...view, onEditTask, updateTask, toggleTask };
}

describe("weekly overview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(stamp));
    useUiStore.setState({ language: "es" });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it("makes all seven dated sections the primary panorama instead of a daily hourly agenda", () => {
    const view = renderWeek(createEmptySnapshot());
    const primary = view.container.querySelector(".weekly-editorial-agenda") as HTMLElement;
    const days = [...primary.querySelectorAll<HTMLElement>(".weekly-day-group")];
    expect(days.map((day) => day.id)).toEqual(Array.from({ length: 7 }, (_, index) => `weekly-day-2026-10-${String(index + 5).padStart(2, "0")}`));
    expect(within(primary).getByRole("heading", { name: "Tu semana" })).toBeTruthy();
    expect(view.getByRole("heading", { level: 1, name: "Mi semana" })).toBeTruthy();
    for (const day of days) {
      expect(day.closest("details")).toBeNull();
      expect(day.hidden).toBe(false);
      expect(within(day).getByRole("link", { name: "Ver día" }).getAttribute("href"))
        .toBe(`/app/planning?view=day&date=${day.id.slice("weekly-day-".length)}`);
    }
    expect(primary.querySelector(".prep-day")).toBeNull();
    expect(primary.querySelector(".editorial-agenda-grid")).toBeNull();
    expect(view.queryByRole("region", { name: "Agenda horaria" })).toBeNull();
    expect(view.queryByRole("heading", { name: "Plan diario" })).toBeNull();
    expect(primary.querySelector(".prep-day-switch [aria-current='page']")?.textContent).toBe("Semana");
  });

  it("shows saved task/event times and preserves the difference between duration and no duration", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [task("Paso puntual", "2026-10-05", "09:15"), task("Bloque de lectura", "2026-10-05", "08:00", 30), task("Sin hora"), task("Otro día", "2026-10-06", "11:00")];
    snapshot.events = [{ id: "event", title: "Reunión", category: "personal", startDate: "2026-10-05", startTime: "12:00", endTime: "13:00", createdAt: stamp, updatedAt: stamp }];
    const before = JSON.stringify(snapshot);
    const view = renderWeek(snapshot);
    const monday = view.container.querySelector("#weekly-day-2026-10-05") as HTMLElement;
    const rows = [...monday.querySelectorAll<HTMLElement>(".weekly-task-row")];
    expect(rows.map((row) => row.dataset.recordId)).toEqual(["task-Bloque de lectura", "task-Paso puntual", "task-Sin hora"]);
    expect(rows[0].querySelector("time")?.textContent).toBe("08:00 · 30 min");
    expect(rows[1].querySelector("time")?.textContent).toBe("09:15");
    expect(rows[1].querySelector("time")?.getAttribute("datetime")).toBe("09:15");
    expect(rows[2].querySelector("time")).toBeNull();
    expect(within(monday).getByText("12:00–13:00")).toBeTruthy();
    expect(within(monday).queryByText("Otro día")).toBeNull();
    expect(view.container.querySelector("#weekly-day-2026-10-06 time")?.textContent).toBe("11:00");
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it("keeps dated Day links and the Day tab when the anchor is midweek", () => {
    const view = renderWeek(createEmptySnapshot(), new Date("2026-10-07T12:00:00"));
    const primary = view.container.querySelector(".weekly-editorial-agenda") as HTMLElement;
    expect(primary.querySelectorAll(".weekly-day-group")).toHaveLength(7);
    expect(primary.querySelector(".weekly-day-group")?.id).toBe("weekly-day-2026-10-05");
    expect(within(primary).getByRole("link", { name: "Día" }).getAttribute("href"))
      .toBe("/app/planning?view=day&date=2026-10-07");
    expect(within(primary).getAllByRole("link", { name: "Ver día" })).toHaveLength(7);
  });

  it("keeps edit, reschedule and completion actions connected to the canonical task", async () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [task("Paso canónico", "2026-10-05", "09:15")];
    const view = renderWeek(snapshot);
    const row = view.container.querySelector(".weekly-task-row") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Más opciones para Paso canónico"));
    fireEvent.click(within(row).getByRole("button", { name: "Editar tarea" }));
    expect(view.onEditTask).toHaveBeenCalledExactlyOnceWith(snapshot.tasks[0]);
    fireEvent.click(within(row).getByLabelText("Cambiar día: Paso canónico"));
    await act(async () => {
      fireEvent.click(within(row).getByRole("button", { name: "Asignar Paso canónico al martes, 6 de octubre" }));
    });
    expect(view.updateTask).toHaveBeenCalledExactlyOnceWith("Paso canónico", { title: "Paso canónico", date: "2026-10-06" });
    await act(async () => { fireEvent.click(within(row).getByRole("button", { name: "Completar Paso canónico" })); });
    expect(view.toggleTask).toHaveBeenCalledExactlyOnceWith("Paso canónico");
    expect(snapshot.tasks[0].time).toBe("09:15");
    expect(snapshot.tasks[0].estimatedMinutes).toBeUndefined();
  });

  it("keeps habits and health-plan links alongside the seven-day panorama", () => {
    const snapshot = createEmptySnapshot();
    snapshot.habits = [{ id: "habit", name: "Leer con calma", type: "boolean", scheduledDays: [1], target: 1, unit: "vez", status: "active", createdAt: stamp, updatedAt: stamp }];
    snapshot.workoutLogs = [{ id: "workout", date: "2026-10-05", weekKey: "2026-W41", name: "Movimiento suave", exercises: [], createdAt: stamp, updatedAt: stamp }];
    snapshot.nutritionLogs = [{ id: "meal-plan", date: "2026-10-05", meals: [{ id: "meal", name: "Desayuno preparado" }], createdAt: stamp, updatedAt: stamp }];
    const view = renderWeek(snapshot);
    const monday = view.container.querySelector("#weekly-day-2026-10-05") as HTMLElement;
    expect(within(monday).getByText("Leer con calma")).toBeTruthy();
    expect(within(monday).getByRole("link", { name: "Movimiento suave" }).getAttribute("href")).toBe("/app/health?section=training&date=2026-10-05");
    expect(within(monday).getByRole("link", { name: "Desayuno preparado" }).getAttribute("href")).toBe("/app/health?section=nutrition&date=2026-10-05");
    const tuesday = view.container.querySelector("#weekly-day-2026-10-06") as HTMLElement;
    expect(within(tuesday).queryByText("Leer con calma")).toBeNull();
  });
});
