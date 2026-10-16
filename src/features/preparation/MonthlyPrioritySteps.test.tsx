// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { applyMonthlyPriorityStep, type MonthlyPriorityStepInput } from "@/src/domain/monthlyPrioritySteps";
import { weekPreparation } from "@/src/domain/weekPreparation";
import { toLocalDateKey } from "@/src/lib/dates";
import { MonthlyPrioritySteps } from "./MonthlyPrioritySteps";

afterEach(cleanup);
function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.cascadePlans = [{ id: "month", horizon: "monthly", periodKey: "2026-10", priority: "", intention: "Leer con calma", objectives: ["Terminar un libro"], activities: [], createdAt: "2026-10-01", updatedAt: "2026-10-01" }];
  return snapshot;
}
function setup(snapshot = fixture(), save?: (input: MonthlyPriorityStepInput) => Promise<PlannerSnapshot>) {
  let stored = snapshot;
  const saveMonthlyPriorityStep = vi.fn(save ?? (async (input: MonthlyPriorityStepInput) => {
    stored = applyMonthlyPriorityStep(stored, input, { id: () => crypto.randomUUID(), now: "2026-10-01" });
    return stored;
  }));
  const onClose = vi.fn();
  const planner = { snapshot, saveMonthlyPriorityStep, saveWeekPreparation: vi.fn() } as unknown as PlannerController;
  const view = render(<I18nProvider><MemoryRouter><MonthlyPrioritySteps planner={planner} week="2026-10-05" open onClose={onClose} /></MemoryRouter></I18nProvider>);
  return { ...view, onClose, saveMonthlyPriorityStep, read: () => stored };
}
describe("monthly priority editor", () => {
  it("does not copy the monthly priority into a task and saves only the concrete step", async () => {
    const view = setup();
    expect((view.getByLabelText("Paso concreto") as HTMLTextAreaElement).value).toBe("");
    fireEvent.change(view.getByLabelText("Paso concreto"), { target: { value: "Leer capítulos 3 y 4" } });
    fireEvent.change(view.getByLabelText("Hora (opcional)"), { target: { value: "20:00" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    await view.findByRole("heading", { name: "Tu paso está guardado" });
    expect(view.onClose).not.toHaveBeenCalled();
    expect(view.saveMonthlyPriorityStep).toHaveBeenCalledWith(expect.objectContaining({ planId: "month", priority: "Terminar un libro", title: "Leer capítulos 3 y 4", date: "2026-10-05", time: "20:00" }));
    expect(view.getByText("Leer capítulos 3 y 4").getAttribute("data-no-translate")).toBe("true");
    expect(view.getByText("Terminar un libro").getAttribute("data-no-translate")).toBe("true");
    expect(view.getByText("Plan mensual · octubre de 2026")).toBeTruthy();
    expect(view.getByText("5 de octubre de 2026")).toBeTruthy();
    expect(view.getByRole("dialog").querySelector('time[datetime="2026-10-05T20:00"]')?.textContent).toBeTruthy();
    expect(view.getByRole("link", { name: "Ver mi semana" }).getAttribute("href")).toBe("/app/planning/weekly?date=2026-10-05");
    expect(document.activeElement).toBe(view.getByRole("heading", { name: "Tu paso está guardado" }));
    const readiness = weekPreparation(view.read(), "2026-10-05");
    expect(readiness.ready).toBe(0);
    expect(readiness.rows.find((row) => row.id === "priorities")?.state).toBe("progress");
    expect(view.read().cascadePlans[0].objectives).toEqual(["Terminar un libro"]);
    fireEvent.click(view.getByRole("button", { name: "Seguir preparando" }));
    expect(view.onClose).toHaveBeenCalledOnce();
  });
  it("requires explicit move confirmation and reuses the existing identity", async () => {
    const snapshot = applyMonthlyPriorityStep(fixture(), { planId: "month", priority: "Terminar un libro", title: "Leer capítulos", actionKey: "original-action", date: "2026-10-01" }, { id: () => "original-task", now: "2026-10-01" });
    const view = setup(snapshot);
    fireEvent.change(view.getByLabelText("Elegir una acción"), { target: { value: "original-task" } });
    fireEvent.change(view.getByLabelText("Día para este paso"), { target: { value: "2026-10-05" } });
    fireEvent.submit(view.getByRole("button", { name: "Guardar paso" }).closest("form")!);
    await waitFor(() => expect(view.getByRole("alert")).toBeTruthy());
    expect(view.saveMonthlyPriorityStep).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("checkbox"));
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    await view.findByRole("heading", { name: "Tu paso está guardado" });
    expect(view.saveMonthlyPriorityStep).toHaveBeenCalledWith(expect.objectContaining({ taskId: "original-task", actionKey: "original-action", confirmMove: true, date: "2026-10-05" }));
  });
  it("keeps a failed draft and retries without reporting success", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockImplementationOnce(async (input: MonthlyPriorityStepInput) => applyMonthlyPriorityStep(fixture(), input, { id: () => "retry-task", now: "2026-10-01" }));
    const view = setup(fixture(), save);
    fireEvent.change(view.getByLabelText("Paso concreto"), { target: { value: "Leer un capítulo" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect(view.onClose).not.toHaveBeenCalled();
    expect(view.queryByRole("heading", { name: "Tu paso está guardado" })).toBeNull();
    expect((view.getByLabelText("Paso concreto") as HTMLTextAreaElement).value).toBe("Leer un capítulo");
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    await view.findByRole("heading", { name: "Tu paso está guardado" });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][0].actionKey).toBe(save.mock.calls[1][0].actionKey);
  });
  it("allows an independent action without any monthly plan", async () => {
    const view = setup(createEmptySnapshot());
    expect(view.getByRole("link", { name: "Organizar este mes" })).toBeTruthy();
    fireEvent.change(view.getByLabelText("Paso concreto"), { target: { value: "Caminar con calma" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    await view.findByRole("heading", { name: "Tu paso está guardado" });
    expect(view.saveMonthlyPriorityStep).toHaveBeenCalledWith(expect.objectContaining({ planId: undefined, priority: undefined, title: "Caminar con calma" }));
    expect(view.getByText("Acción independiente")).toBeTruthy();
    expect(view.getByText("Sin hora; aparece en las tareas del día")).toBeTruthy();
  });
  it("waits for persisted task data before confirming and blocks duplicate saves", async () => {
    let resolve!: (snapshot: PlannerSnapshot) => void;
    const pending = new Promise<PlannerSnapshot>((accept) => { resolve = accept; });
    const view = setup(fixture(), () => pending);
    fireEvent.change(view.getByLabelText("Paso concreto"), { target: { value: "  Leer despacio  " } });
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    expect(view.queryByRole("heading", { name: "Tu paso está guardado" })).toBeNull();
    expect(view.getByRole("button", { name: "Guardar paso" }).matches(":disabled")).toBe(true);
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    expect(view.saveMonthlyPriorityStep).toHaveBeenCalledOnce();
    const persisted = applyMonthlyPriorityStep(fixture(), view.saveMonthlyPriorityStep.mock.calls[0][0], { id: () => "confirmed-task", now: "2026-10-01" });
    await act(async () => resolve(persisted));
    await view.findByRole("heading", { name: "Tu paso está guardado" });
    expect(view.getByText("Leer despacio").textContent).toBe("Leer despacio");
    expect(view.onClose).not.toHaveBeenCalled();
  });
  it("does not invent success when the returned snapshot lacks the saved task", async () => {
    const view = setup(fixture(), async () => fixture());
    fireEvent.change(view.getByLabelText("Paso concreto"), { target: { value: "Leer un capítulo" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    await view.findByRole("alert");
    expect(view.queryByRole("heading", { name: "Tu paso está guardado" })).toBeNull();
    expect((view.getByLabelText("Paso concreto") as HTMLTextAreaElement).value).toBe("Leer un capítulo");
  });
  it("links to the saved date's week and shows Today only for today's date", async () => {
    const view = setup();
    fireEvent.change(view.getByLabelText("Paso concreto"), { target: { value: "Leer el sábado" } });
    fireEvent.change(view.getByLabelText("Día para este paso"), { target: { value: "2026-11-07" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    await view.findByRole("heading", { name: "Tu paso está guardado" });
    expect(view.getByRole("link", { name: "Ver mi semana" }).getAttribute("href")).toBe("/app/planning/weekly?date=2026-11-02");
    expect(view.getByRole("link", { name: "Ver día elegido" }).getAttribute("href")).toBe("/app/planning?view=day&date=2026-11-07");
    expect(view.queryByRole("link", { name: "Ver Hoy" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Añadir otro paso" }));
    fireEvent.change(view.getByLabelText("Paso concreto"), { target: { value: "Leer hoy" } });
    fireEvent.change(view.getByLabelText("Día para este paso"), { target: { value: toLocalDateKey(new Date()) } });
    fireEvent.click(view.getByRole("button", { name: "Guardar paso" }));
    await view.findByRole("heading", { name: "Tu paso está guardado" });
    expect(view.getByRole("link", { name: "Ver Hoy" }).getAttribute("href")).toBe("/app/today");
    expect(view.read().tasks).toHaveLength(2);
    expect(view.saveMonthlyPriorityStep.mock.calls[0][0].actionKey).not.toBe(view.saveMonthlyPriorityStep.mock.calls[1][0].actionKey);
  });
});
