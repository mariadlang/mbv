// @vitest-environment jsdom
import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { TodayPage } from "./TodayPage";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { useUiStore } from "@/src/stores/useUiStore";
import { UnsavedDraftProvider } from "@/src/components/navigation/UnsavedDraftProvider";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";

// Unrelated account/calendar surfaces are isolated; the real Today task renderer and i18n run.
vi.mock("@/src/features/dashboard/ReturnExperienceCard", () => ({ ReturnExperienceCard: () => null }));
vi.mock("@/src/hooks/useCalendarIntegration", () => ({ useCalendarIntegration: () => ({ events: [], snapshot: { calendars: [] }, connected: false }) }));
afterEach(() => { cleanup(); useUiStore.setState({ language: "es" }); });

describe("H01 Today stored task time", () => {
  it.each(["es", "en"] as const)("renders local HH:mm including midnight, leaves untimed details and ordering intact (%s)", language => {
    useUiStore.setState({ language });
    const snapshot = createEmptySnapshot();
    const stamp = "2026-10-20T12:00:00Z";
    snapshot.tasks = [
      { id: "timed", title: "Paso mensual", time: "18:30", periodPlanId: "month", goalId: "goal", projectId: "project" },
      { id: "untimed", title: "Sin hora guardada", focusPriority: 2 as const },
      { id: "midnight", title: "Medianoche", time: "00:00" },
      { id: "priority", title: "Prioridad con hora", time: "10:00", focusPriority: 1 as const },
    ].map(task => ({ ...task, date: toLocalDateKey(new Date()), priority: "medium", status: "planned", createdAt: stamp, updatedAt: stamp }));
    snapshot.cascadePlans = [{ id: "month", horizon: "monthly", periodKey: "2026-10", intention: "Intención distinta", priority: "Mi prioridad concreta", objectives: ["Mi prioridad concreta"], activities: [], details: { "preparation.v1.priorityTask.timed": "Mi prioridad concreta" }, createdAt: stamp, updatedAt: stamp }];
    snapshot.goals = [{ id: "goal", title: "Meta vinculada", status: "active", createdAt: stamp, updatedAt: stamp } as typeof snapshot.goals[number]];
    snapshot.projects = [{ id: "project", name: "Proyecto vinculado", outcome: "Resultado", status: "active", createdAt: stamp, updatedAt: stamp }];
    const before = structuredClone(snapshot);
    const planner = { snapshot } as PlannerController;
    const tree = () => <I18nProvider><RouterProvider router={createMemoryRouter([{ path: "/", element: <UnsavedDraftProvider><TodayPage planner={planner} onQuickCapture={vi.fn()} onNeedHelp={vi.fn()} /></UnsavedDraftProvider> }])} /></I18nProvider>;
    const view = render(tree());
    const rows = () => Array.from(view.container.querySelectorAll(".day-timeline-list article"));
    const details = () => rows().map(row => row.querySelector("small")?.textContent);
    const origin = language === "es" ? "Prioridad mensual" : "Monthly priority";
    const priority = language === "es" ? "Prioridad" : "Priority";
    const todayTask = language === "es" ? "Tarea de hoy" : "Today’s task";
    expect(details()).toEqual([
      `18:30 · Meta vinculada · Proyecto vinculado · ${origin}: Mi prioridad concreta`,
      `${priority} 2`, `00:00 · ${todayTask}`, `10:00 · ${priority} 1`,
    ]);
    expect(rows().map(row => row.querySelector("strong")?.textContent)).toEqual(snapshot.tasks.map(task => task.title));
    for (const row of rows()) expect(within(row as HTMLElement).getAllByRole("button")).toHaveLength(2);
    expect(snapshot).toEqual(before); // Presentation must not mutate any stored fields or relations.
    planner.snapshot = { ...snapshot, tasks: snapshot.tasks.map(task => task.id === "timed" ? { ...task, time: "19:00" } : task) };
    view.rerender(tree());
    expect(details()[0]).toBe(`19:00 · Meta vinculada · Proyecto vinculado · ${origin}: Mi prioridad concreta`);
    expect(planner.snapshot.tasks.map(task => task.id)).toEqual(before.tasks.map(task => task.id));
  });
});
