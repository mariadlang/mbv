// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { useUiStore } from "@/src/stores/useUiStore";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import { createPlannerService } from "@/src/services/plannerService";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { LearnPage } from "./LearnPage";

afterEach(() => { cleanup(); vi.useRealTimers(); useUiStore.setState({ language: "es" }); });

function setup() {
  let stored = createEmptySnapshot();
  // Existing duplicates are intentionally legitimate input, never auto-cleaned.
  stored.tasks = ["historical-a", "historical-b"].map(id => ({ id, title: "Elegir mis tres prioridades", date: "2026-10-18", priority: "medium", status: "planned", createdAt: "2026-10-18", updatedAt: "2026-10-18" }));
  const before = structuredClone(stored);
  const replace = vi.fn(async (next: PlannerSnapshot) => { stored = structuredClone(next); });
  const service = createPlannerService({ load: async () => structuredClone(stored), replace, clear: async () => {}, close() {} });
  const createTask = vi.fn(service.createTask);
  const planner = { snapshot: stored, createTask } as unknown as PlannerController;
  const view = render(<I18nProvider><MemoryRouter><LearnPage planner={planner} /></MemoryRouter></I18nProvider>);
  return { ...view, createTask, replace, service, before, read: () => structuredClone(stored), buttons: () => view.container.querySelectorAll<HTMLButtonElement>(".learn-card button") };
}

describe("H08 Learn suggestion operation", () => {
  it("guards synchronous repeated activation, keeps one local non-priority ID and preserves old duplicates", async () => {
    const view = setup();
    const button = view.buttons()[0];
    act(() => { button.click(); button.click(); button.click(); });
    await waitFor(() => expect(button.textContent).toContain("Añadido a Mi día"));
    expect(view.createTask).toHaveBeenCalledTimes(1);
    expect(view.createTask).toHaveBeenCalledWith("Elegir mis tres prioridades", toLocalDateKey(new Date()));
    expect(button.disabled).toBe(true);
    expect(button.querySelector(".lucide-check")).not.toBeNull();
    expect(button.querySelector(".lucide-chevron-right")).toBeNull();
    expect(button.getAttribute("data-feedback")).toBe("success");
    fireEvent.click(button);
    expect(view.read().tasks).toHaveLength(3);
    const task = view.read().tasks.find(t => !t.id.startsWith("historical"))!;
    expect(task.focusPriority).toBeUndefined();
    expect(task.date).toBe(toLocalDateKey(new Date()));
    expect((await view.service.load()).tasks.find(t => t.id === task.id)).toEqual(task);
    expect(view.read().tasks.filter(t => t.id.startsWith("historical"))).toEqual(view.before.tasks);
    expect(view.getByRole("link", { name: "Ver mi día" }).getAttribute("href")).toBe("/app/today");
  });

  it("holds a real repository write pending, then confirms independent suggestions without reopening the first", async () => {
    const view = setup();
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const persist = view.replace.getMockImplementation()!;
    view.replace.mockImplementationOnce(async next => { await pending; await persist(next); });
    fireEvent.click(view.buttons()[0]);
    expect(view.buttons()[0].textContent).toContain("Añadiendo…");
    expect(view.buttons()[0].getAttribute("aria-busy")).toBe("true");
    expect(view.buttons()[0].querySelectorAll(".button__spinner")).toHaveLength(1);
    expect(view.buttons()[0].querySelector(".lucide-chevron-right")).toBeNull();
    expect(view.getAllByRole("status")[0].className).toBe("sr-only");
    expect(view.queryByText("Añadido a Mi día como tarea no prioritaria.")).toBeNull();
    act(() => { view.buttons()[0].click(); view.buttons()[0].click(); view.buttons()[1].click(); });
    expect(view.createTask).toHaveBeenCalledTimes(2);
    expect(view.read().tasks).toHaveLength(2);
    await act(async () => release());
    await waitFor(() => expect(view.getAllByText("Añadido a Mi día como tarea no prioritaria.")).toHaveLength(2));
    expect(view.buttons()[0].disabled).toBe(true);
    expect(view.buttons()[1].disabled).toBe(true);
    expect(view.buttons()[2].disabled).toBe(false);
    expect(new Set(view.read().tasks.map(t => t.id)).size).toBe(4);
  });

  it("releases a failed write, does not duplicate the hook error alert, and retries to one record", async () => {
    const view = setup();
    view.replace.mockRejectedValueOnce(new Error("Synthetic storage failure before commit"));
    fireEvent.click(view.buttons()[0]);
    await waitFor(() => expect(view.buttons()[0].disabled).toBe(false));
    expect(view.read()).toEqual(view.before);
    expect(view.queryByText("Añadido a Mi día como tarea no prioritaria.")).toBeNull();
    expect(view.queryByRole("alert")).toBeNull(); // shared usePlanner error is tested through the actual UI in E2E
    fireEvent.click(view.buttons()[0]);
    await waitFor(() => expect(view.buttons()[0].textContent).toContain("Añadido a Mi día"));
    expect(view.createTask).toHaveBeenCalledTimes(2);
    expect(view.read().tasks).toHaveLength(3);
  });

  it("still permits deliberate manual tasks with identical titles", async () => {
    const view = setup();
    await view.service.createTask("Same manual title", "2026-10-19");
    await view.service.createTask("Same manual title", "2026-10-19");
    const tasks = view.read().tasks.filter(t => t.title === "Same manual title");
    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).not.toBe(tasks[1].id);
  });

  it("allows the suggestion on a new local date without forgetting the previous date's operation", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 19, 23, 59, 59));
    const view = setup();
    await act(async () => { view.buttons()[0].click(); });
    expect(view.buttons()[0].disabled).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(view.buttons()[0].disabled).toBe(false);
    await act(async () => { view.buttons()[0].click(); });
    expect(view.createTask.mock.calls.map(call => call[1])).toEqual(["2026-10-19", "2026-10-20"]);
    expect(view.read().tasks).toHaveLength(4);
  });

  it("renders English pending/success and live confirmation through stable translation keys", async () => {
    useUiStore.setState({ language: "en" });
    const view = setup();
    expect(view.buttons()[0].textContent).toContain("Apply to My day");
    fireEvent.click(view.buttons()[0]);
    expect(view.buttons()[0].textContent).toContain("Adding…");
    await waitFor(() => expect(view.buttons()[0].textContent).toContain("Added to My day"));
    const confirmation = view.getByText("Added to My day as a non-priority task.");
    expect(confirmation.getAttribute("role")).toBe("status");
    expect(confirmation.getAttribute("aria-atomic")).toBe("true");
  });
});
