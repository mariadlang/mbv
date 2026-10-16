// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { UserAccess } from "@/src/domain/access";
import { toLocalDateKey } from "@/src/lib/dates";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { UnsavedDraftProvider } from "@/src/components/navigation/UnsavedDraftProvider";
import { TasksPage } from "./TasksPage";

afterEach(cleanup);
const access = { role: "superadmin", accessStatus: "active" } as UserAccess;
function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.tasks = ["one", "two"].map((id) => ({ id, title: `Tarea ${id}`, date: toLocalDateKey(new Date()), priority: "medium", status: "planned", createdAt: "2026-10-02", updatedAt: "2026-10-02" }));
  snapshot.projects = ["one", "two"].map((id) => ({ id, name: `Proyecto ${id}`, outcome: "Resultado real", status: "active", createdAt: "2026-10-02", updatedAt: "2026-10-02" }));
  return snapshot;
}
function harness(overrides: Partial<PlannerController> = {}) {
  const snapshot = fixture();
  const createTaskDetailed = vi.fn().mockResolvedValue(snapshot);
  const createProject = vi.fn().mockResolvedValue(snapshot);
  const updateTask = vi.fn().mockResolvedValue(snapshot);
  const addProjectChecklistItem = vi.fn().mockResolvedValue(snapshot);
  const planner = { snapshot, createTaskDetailed, createProject, updateTask, addProjectChecklistItem, ...overrides } as unknown as PlannerController;
  const router = createMemoryRouter([{ element: <I18nProvider><UnsavedDraftProvider><Outlet /></UnsavedDraftProvider></I18nProvider>, children: [{ path: "/", element: <TasksPage planner={planner} access={access} onQuickCapture={vi.fn()} /> }, { path: "/other", element: <p>Otra pantalla</p> }] }]);
  return { ...render(<RouterProvider router={router} />), router, createTaskDetailed, createProject, updateTask, addProjectChecklistItem };
}

describe("legacy tasks and projects draft protection", () => {
  it("protects advanced drafts on tab changes and discards explicitly when closing", async () => {
    const view = harness();
    fireEvent.click(view.getByRole("button", { name: "Nueva tarea" }));
    fireEvent.change(view.getByLabelText("Tarea"), { target: { value: "Texto sin guardar" } });
    fireEvent.click(view.getByRole("tab", { name: "Próximas" }));
    fireEvent.click(view.getByRole("button", { name: "Seguir editando" }));
    expect((view.getByLabelText("Tarea") as HTMLInputElement).value).toBe("Texto sin guardar");
    expect(view.getByRole("tab", { name: "Mi día" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(view.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(view.getByRole("button", { name: "Descartar cambios" }));
    await waitFor(() => expect(view.queryByLabelText("Tarea")).toBeNull());
    fireEvent.click(view.getByRole("button", { name: "Nueva tarea" }));
    expect((view.getByLabelText("Tarea") as HTMLInputElement).value).toBe("");
    expect(view.createTaskDetailed).not.toHaveBeenCalled();
  });

  it("validates an advanced task and preserves it after failure before retrying", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(fixture());
    const view = harness({ createTaskDetailed: save });
    fireEvent.click(view.getByRole("button", { name: "Nueva tarea" }));
    fireEvent.change(view.getByLabelText("Tarea"), { target: { value: "Paso concreto" } });
    fireEvent.click(view.getByRole("button", { name: "Añadir duración y conexiones" }));
    fireEvent.change(view.getByLabelText("Duración estimada"), { target: { value: "-1" } });
    fireEvent.submit(view.getByLabelText("Tarea").closest("form")!);
    expect(save).not.toHaveBeenCalled();
    expect(view.getByRole("alert")).toBeTruthy();
    fireEvent.change(view.getByLabelText("Duración estimada"), { target: { value: "15" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar tarea" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect((view.getByLabelText("Tarea") as HTMLInputElement).value).toBe("Paso concreto");
    fireEvent.click(view.getByRole("button", { name: "Guardar tarea" }));
    await waitFor(() => expect(view.queryByLabelText("Tarea")).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Paso concreto", estimatedMinutes: 15 }));
  });

  it("keeps a project after failed save-and-continue and navigates only after retry", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(fixture());
    const view = harness({ createProject: save });
    fireEvent.click(view.getByRole("button", { name: "Nuevo proyecto" }));
    fireEvent.change(view.getByLabelText("Nombre del proyecto"), { target: { value: "Proyecto nuevo" } });
    fireEvent.change(view.getByLabelText("Resultado esperado"), { target: { value: "Entregable real" } });
    await act(() => view.router.navigate("/other"));
    fireEvent.click(await view.findByRole("button", { name: "Guardar y continuar" }));
    await waitFor(() => expect(within(view.getByRole("dialog")).getByRole("alert")).toBeTruthy());
    expect(view.router.state.location.pathname).toBe("/");
    expect((view.getByLabelText("Nombre del proyecto") as HTMLInputElement).value).toBe("Proyecto nuevo");
    fireEvent.click(view.getByRole("button", { name: "Guardar y continuar" }));
    await view.findByText("Otra pantalla");
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Proyecto nuevo", outcome: "Entregable real" }));
  });

  it("saves the original task before switching editors and freezes input during persistence", async () => {
    let resolve!: (snapshot: PlannerSnapshot) => void;
    const save = vi.fn(() => new Promise<PlannerSnapshot>((done) => { resolve = done; }));
    const view = harness({ updateTask: save });
    fireEvent.click(view.getByRole("button", { name: "Editar Tarea one" }));
    fireEvent.change(view.getByLabelText("Nombre de la tarea"), { target: { value: "Tarea ajustada" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(view.getByLabelText("Nombre de la tarea").matches(":disabled")).toBe(true));
    fireEvent.submit(view.getByLabelText("Nombre de la tarea").closest("form")!);
    expect(save).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole("button", { name: "Editar Tarea two" }));
    fireEvent.click(view.getByRole("button", { name: "Guardar y continuar" }));
    expect(view.queryByDisplayValue("Tarea two")).toBeNull();
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => resolve(fixture()));
    fireEvent.click(view.getByRole("button", { name: "Guardar y continuar" }));
    await view.findByDisplayValue("Tarea two");
    expect(save).toHaveBeenLastCalledWith("one", expect.objectContaining({ title: "Tarea ajustada" }));
  });

  it("saves every checklist draft once and preserves the remaining draft on partial failure", async () => {
    const save = vi.fn().mockResolvedValueOnce(fixture()).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(fixture());
    const view = harness({ addProjectChecklistItem: save });
    const inputs = view.getAllByPlaceholderText("Añadir paso a la lista");
    fireEvent.change(inputs[0], { target: { value: "Paso uno" } });
    fireEvent.change(inputs[1], { target: { value: "Paso dos" } });
    await act(() => view.router.navigate("/other"));
    fireEvent.click(await view.findByRole("button", { name: "Guardar y continuar" }));
    await waitFor(() => expect(within(view.getByRole("dialog")).getByRole("alert")).toBeTruthy());
    expect((inputs[0] as HTMLInputElement).value).toBe("");
    expect((inputs[1] as HTMLInputElement).value).toBe("Paso dos");
    expect(view.router.state.location.pathname).toBe("/");
    fireEvent.click(view.getByRole("button", { name: "Guardar y continuar" }));
    await view.findByText("Otra pantalla");
    expect(save.mock.calls).toEqual([["one", "Paso uno"], ["two", "Paso dos"], ["two", "Paso dos"]]);
  });
});
