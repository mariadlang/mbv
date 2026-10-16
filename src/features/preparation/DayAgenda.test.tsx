// @vitest-environment jsdom
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { createEmptySnapshot, type Task } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { DayAgenda } from "./DayAgenda";
vi.mock("@/src/hooks/useCalendarIntegration", () => ({ useCalendarIntegration: () => ({ events: [] }) }));
afterEach(cleanup);
const task = (id: string, time?: string, estimatedMinutes?: number): Task => ({ id, title: id, date: "2026-10-02", time, estimatedMinutes, priority: "medium", status: "planned", createdAt: "2026-10-02T12:00:00Z", updatedAt: "2026-10-02T12:00:00Z" });
describe("canonical hourly agenda", () => {
  it("renders intervals proportionally and time-only tasks as points; only date-only tasks stay outside the grid", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [task("A", "08:00", 120), task("B", "08:30", 60), task("C", "09:00", 60), task("Unscheduled"), task("Only time", "12:00")];
    const onEditTask = vi.fn();
    const planner = { snapshot } as PlannerController;
    const view = render(<I18nProvider><MemoryRouter><DayAgenda planner={planner} date="2026-10-02" onDateChange={vi.fn()} onEditTask={onEditTask} onQuickCapture={vi.fn()} /></MemoryRouter></I18nProvider>);
    const blocks = view.container.querySelectorAll<HTMLElement>(".editorial-agenda-block");
    expect(blocks).toHaveLength(3);
    expect(blocks[0].style.top).toBe("180px");
    expect(blocks[0].style.height).toBe("180px");
    expect(parseFloat(blocks[0].style.width)).toBeCloseTo(100 / 3);
    const outside = view.container.querySelector(".editorial-agenda-unplaced") as HTMLElement;
    expect(within(outside).getByText("Unscheduled")).toBeTruthy();
    expect(within(outside).queryByText("Only time")).toBeNull();
    const point = view.container.querySelector<HTMLElement>(".editorial-agenda-point")!;
    expect(point.dataset.recordId).toBe("task-Only time");
    expect(point.dataset.agendaKind).toBe("point");
    expect(point.style.top).toBe("540px");
    expect(point.style.width).toBe("100%");
    expect(within(point).getByText("12:00")).toBeTruthy();
    expect(within(point).getByText(/Sin duración definida/)).toBeTruthy();
    fireEvent.click(within(blocks[0]).getByRole("button"));
    expect(onEditTask).toHaveBeenCalledWith(snapshot.tasks[0]);
    fireEvent.click(within(point).getByRole("button", { name: "Mover o editar Only time · 12:00 · Sin duración definida" }));
    expect(onEditTask).toHaveBeenLastCalledWith(snapshot.tasks[4]);
    expect(snapshot.tasks[4].estimatedMinutes).toBeUndefined();
    expect(snapshot.tasks[4]).not.toHaveProperty("endTime");
    expect(snapshot.tasks.map((item) => item.id)).toEqual(["A", "B", "C", "Unscheduled", "Only time"]);
  });
  it("clips a cross-midnight event with its unchanged canonical identity", () => {
    const snapshot = createEmptySnapshot();
    snapshot.events = [{ id: "overnight", title: "Overnight", category: "personal", startDate: "2026-10-01", endDate: "2026-10-02", startTime: "23:00", endTime: "01:30", createdAt: "", updatedAt: "" }];
    const view = render(<I18nProvider><MemoryRouter><DayAgenda planner={{ snapshot } as PlannerController} date="2026-10-02" onDateChange={vi.fn()} onEditTask={vi.fn()} onQuickCapture={vi.fn()} mode="week" embedded /></MemoryRouter></I18nProvider>);
    const block = view.container.querySelector<HTMLElement>(".editorial-agenda-block")!;
    expect(block.dataset.recordId).toBe("event-overnight");
    expect(block.style.top).toBe("0px");
    expect(block.style.height).toBe("135px");
    expect(block.querySelector("a")?.getAttribute("href")).toBe("/app/life-hub?tab=events&date=2026-10-02&event=overnight");
    expect(view.container.querySelector(".prep-day-switch [aria-current]")?.textContent).toBe("Semana");
    expect(snapshot.events).toHaveLength(1);
  });
  it("separates points at the same time from an overlapping event without fabricating task durations", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [task("First point", "09:00"), task("Second point", "09:00")];
    snapshot.events = [{ id: "event", title: "Real interval", category: "personal", startDate: "2026-10-02", startTime: "08:00", endTime: "10:00", createdAt: "", updatedAt: "" }];
    const before = JSON.stringify(snapshot);
    const view = render(<I18nProvider><MemoryRouter><DayAgenda planner={{ snapshot } as PlannerController} date="2026-10-02" onDateChange={vi.fn()} onEditTask={vi.fn()} onQuickCapture={vi.fn()} /></MemoryRouter></I18nProvider>);
    const block = view.container.querySelector<HTMLElement>(".editorial-agenda-block")!;
    const points = [...view.container.querySelectorAll<HTMLElement>(".editorial-agenda-point")];
    expect(block.style.height).toBe("180px");
    expect(points.map((point) => point.style.top)).toEqual(["270px", "270px"]);
    expect(new Set([block.style.left, ...points.map((point) => point.style.left)]).size).toBe(3);
    for (const point of points) expect(parseFloat(point.style.width)).toBeCloseTo(100 / 3);
    expect(view.container.querySelector(".editorial-agenda-unplaced")).toBeNull();
    expect(JSON.stringify(snapshot)).toBe(before);
  });
  it("includes late and midnight points in the scrollable grid and keeps controls read-only", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [task("Midnight", "00:00"), { ...task("Late", "23:59"), status: "completed" }];
    const edit = vi.fn();
    const view = render(<I18nProvider><MemoryRouter><DayAgenda planner={{ snapshot } as PlannerController} date="2026-10-02" onDateChange={vi.fn()} onEditTask={edit} onQuickCapture={vi.fn()} readOnly /></MemoryRouter></I18nProvider>);
    const points = [...view.container.querySelectorAll<HTMLElement>(".editorial-agenda-point")];
    expect(points.map((point) => point.style.top)).toEqual(["0px", "2158.5px"]);
    const gridHeight = parseFloat(view.container.querySelector<HTMLElement>(".editorial-agenda-grid")!.style.height);
    expect(gridHeight).toBeGreaterThanOrEqual(2158.5 + parseFloat(points[1].style.height));
    expect(points[1].classList.contains("is-complete")).toBe(true);
    for (const point of points) {
      const button = within(point).getByRole<HTMLButtonElement>("button");
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(edit).not.toHaveBeenCalled();
    expect(view.getByRole("region", { name: "Agenda horaria" }).getAttribute("tabindex")).toBe("0");
  });
  it("retains the accessible list and its canonical completion control for time-only tasks", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [task("Point action", "09:15")];
    const toggleTask = vi.fn().mockResolvedValue(snapshot);
    const view = render(<I18nProvider><MemoryRouter><DayAgenda planner={{ snapshot, toggleTask } as unknown as PlannerController} date="2026-10-02" onDateChange={vi.fn()} onEditTask={vi.fn()} onQuickCapture={vi.fn()} /></MemoryRouter></I18nProvider>);
    const readable = view.container.querySelector(".editorial-agenda-readable") as HTMLElement;
    fireEvent.click(within(readable).getByText("Lista accesible de actividades"));
    expect(within(readable).getByText("Point action")).toBeTruthy();
    fireEvent.click(within(readable).getByRole("button", { name: "Completar Point action" }));
    expect(toggleTask).toHaveBeenCalledExactlyOnceWith("Point action");
  });
});
