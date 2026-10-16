// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { UserAccess } from "@/src/domain/access";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { UnsavedDraftProvider } from "@/src/components/navigation/UnsavedDraftProvider";
import { GoalsPage } from "./GoalsPage";

afterEach(cleanup);
const access = { role: "superadmin", accessStatus: "active" } as UserAccess;
function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.goals = [{ id: "goal-real", title: "Mi resultado", reason: "Porque importa", priority: "medium", progressType: "tasks", status: "active", createdAt: "2026-10-02", updatedAt: "2026-10-02" }];
  snapshot.tasks = [{ id: "task-real", title: "Paso existente", goalId: "goal-real", date: "2026-10-02", priority: "medium", status: "planned", createdAt: "2026-10-02", updatedAt: "2026-10-02" }];
  return snapshot;
}
function harness(snapshot = createEmptySnapshot(), createGoal = vi.fn().mockResolvedValue(fixture()), updateTask = vi.fn().mockResolvedValue(snapshot)) {
  const planner = { snapshot, createGoal, updateTask } as unknown as PlannerController;
  const router = createMemoryRouter([{ element: <I18nProvider><UnsavedDraftProvider><Outlet /></UnsavedDraftProvider></I18nProvider>, children: [{ path: "/", element: <GoalsPage planner={planner} access={access} /> }, { path: "/other", element: <p>Otra pantalla</p> }] }]);
  return { ...render(<RouterProvider router={router} />), router, createGoal, updateTask };
}

describe("goal editor drafts", () => {
  it("keeps milestone input, guards route changes and discards only after confirmation", async () => {
    const view = harness();
    fireEvent.click(view.getByRole("button", { name: "Crear meta" }));
    fireEvent.change(view.getByLabelText("¿Qué quieres lograr?"), { target: { value: "Mi resultado" } });
    fireEvent.click(view.getByRole("button", { name: /Cambiar método/ }));
    fireEvent.change(view.getByLabelText("Método"), { target: { value: "milestones" } });
    fireEvent.change(view.getByPlaceholderText("Hito 1"), { target: { value: "Primer hito real" } });
    fireEvent.click(view.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(view.getByRole("button", { name: "Seguir editando" }));
    expect((view.getByPlaceholderText("Hito 1") as HTMLInputElement).value).toBe("Primer hito real");
    await act(() => view.router.navigate("/other"));
    expect(view.router.state.location.pathname).toBe("/");
    fireEvent.click(await view.findByRole("button", { name: "Descartar cambios" }));
    await view.findByText("Otra pantalla");
    expect(view.createGoal).not.toHaveBeenCalled();
  });

  it("retains failed goal saves and saves the validated goal and milestones before closing", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(fixture());
    const view = harness(createEmptySnapshot(), save);
    fireEvent.click(view.getByRole("button", { name: "Crear meta" }));
    fireEvent.change(view.getByLabelText("¿Qué quieres lograr?"), { target: { value: "Mi resultado" } });
    fireEvent.change(view.getByLabelText("¿Por qué importa para ti?"), { target: { value: "Porque importa" } });
    fireEvent.click(view.getByRole("button", { name: /Cambiar método/ }));
    fireEvent.change(view.getByLabelText("Método"), { target: { value: "milestones" } });
    fireEvent.change(view.getByPlaceholderText("Hito 1"), { target: { value: "Primer hito real" } });
    fireEvent.click(within(view.getByRole("dialog")).getByRole("button", { name: "Crear meta" }));
    await view.findByRole("alert");
    expect((view.getByLabelText("¿Qué quieres lograr?") as HTMLInputElement).value).toBe("Mi resultado");
    expect(view.queryByText("Meta creada")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(view.getByRole("button", { name: "Guardar y continuar" }));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Mi resultado", reason: "Porque importa", progressType: "milestones" }), ["Primer hito real", ""]);
  });

  it("does not claim success or double-save while goal persistence is pending", async () => {
    let resolve!: (snapshot: PlannerSnapshot) => void;
    const save = vi.fn(() => new Promise<PlannerSnapshot>((done) => { resolve = done; }));
    const view = harness(createEmptySnapshot(), save);
    fireEvent.click(view.getByRole("button", { name: "Crear meta" }));
    fireEvent.change(view.getByLabelText("¿Qué quieres lograr?"), { target: { value: "Mi resultado" } });
    fireEvent.change(view.getByLabelText("¿Por qué importa para ti?"), { target: { value: "Porque importa" } });
    const submit = within(view.getByRole("dialog")).getByRole("button", { name: "Crear meta" });
    fireEvent.click(submit);
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(true));
    fireEvent.click(submit);
    expect(save).toHaveBeenCalledTimes(1);
    expect(view.queryByText("Meta creada")).toBeNull();
    await act(async () => resolve(fixture()));
    await view.findByText("Meta creada");
    fireEvent.click(view.getByRole("button", { name: "Ahora no" }));
    expect(view.queryByRole("dialog")).toBeNull();
  });

  it("guards linked actions, retains failed changes and updates the original task ID on retry", async () => {
    const snapshot = fixture();
    const update = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(snapshot);
    const view = harness(snapshot, vi.fn(), update);
    fireEvent.click(view.getByRole("button", { name: "Ver mi camino" }));
    fireEvent.click(view.getByRole("button", { name: "Editar Paso existente" }));
    fireEvent.change(view.getByLabelText("Acción"), { target: { value: "Paso ajustado" } });
    fireEvent.click(view.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(view.getByRole("button", { name: "Seguir editando" }));
    expect((view.getByLabelText("Acción") as HTMLInputElement).value).toBe("Paso ajustado");
    fireEvent.click(view.getByRole("button", { name: "Guardar cambios" }));
    await view.findByRole("alert");
    expect((view.getByLabelText("Acción") as HTMLInputElement).value).toBe("Paso ajustado");
    fireEvent.click(view.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenLastCalledWith("task-real", { title: "Paso ajustado", date: "2026-10-02", projectId: "", goalId: "goal-real" });
  });
});
