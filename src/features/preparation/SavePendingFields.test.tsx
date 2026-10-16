// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { ReactNode } from "react";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { UnsavedDraftProvider } from "@/src/components/navigation/UnsavedDraftProvider";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { UserAccess } from "@/src/domain/access";
import { FitnessPage } from "@/src/features/fitness/FitnessPage";
import { GoalsPage } from "@/src/features/goals/GoalsPage";
import { HealthPlanning } from "./HealthPlanning";
import { GuidePage } from "./GuidePage";
import { MonthLists } from "./MonthLists";
import { EditorialMonthMap } from "./EditorialMonthMap";
import { PreparationChecklist } from "./PreparationShared";

vi.mock("@/src/hooks/useAccount", () => ({ useAccount: () => ({ user: { id: "test-user" } }) }));
vi.mock("@/src/hooks/useLegalPrivacy", () => ({ useLegalPrivacy: () => ({ loading: false, hasConsent: () => true }) }));
afterEach(cleanup);

function pendingSave() {
  let resolve!: (value: PlannerSnapshot) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<PlannerSnapshot>((accept, decline) => { resolve = accept; reject = decline; });
  return { promise, resolve, reject };
}
function screenFor(component: ReactNode, path = "/app/health?date=2026-10-02") {
  const router = createMemoryRouter([{ path: "*", element: <I18nProvider><UnsavedDraftProvider>{component}</UnsavedDraftProvider></I18nProvider> }], { initialEntries: [path] });
  return { ...render(<RouterProvider router={router} />), router };
}
function expectLocked(form: HTMLFormElement) {
  const controls = [...form.querySelectorAll("input, textarea, select, button")];
  expect(controls.length).toBeGreaterThan(0);
  expect(controls.every((control) => control.matches(":disabled"))).toBe(true);
  expect(form.querySelector('fieldset[aria-busy="true"]')).toBeTruthy();
}
const access = { role: "superadmin", accessStatus: "active" } as UserAccess;
function goalSnapshot() {
  const snapshot = createEmptySnapshot();
  snapshot.goals = [{ id: "goal-real", title: "Mi resultado", reason: "Porque importa", priority: "medium", progressType: "tasks", status: "active", createdAt: "2026-10-02", updatedAt: "2026-10-02" }];
  snapshot.tasks = [{ id: "task-real", title: "Paso existente", goalId: "goal-real", date: "2026-10-02", priority: "medium", status: "planned", createdAt: "2026-10-02", updatedAt: "2026-10-02" }];
  return snapshot;
}

describe("fields cannot change underneath a pending save", () => {
  it.each(["month-list", "month-map"] as const)("locks the %s editor and preserves its draft after a failed save", async (editor) => {
    const user = userEvent.setup();
    const pending = pendingSave();
    const snapshot = createEmptySnapshot();
    snapshot.lifeAreas = [{ id: "health", name: "Salud", color: "sage", order: 0, active: true, createdAt: "2026-10-02", updatedAt: "2026-10-02" }];
    const save = vi.fn(() => pending.promise);
    const planner = { snapshot, createBrainDumpItem: save, saveCascadePlan: save } as unknown as PlannerController;
    const component = editor === "month-list" ? <MonthLists planner={planner} month="2026-10" readOnly={false} />
      : <EditorialMonthMap planner={planner} access={access} year={2026} onYearChange={vi.fn()} onEdit={vi.fn()} onCreate={vi.fn()} onOpen={vi.fn()} />;
    const view = screenFor(component, "/app/planning");
    await user.click(view.getAllByRole("button", { name: "Añadir" })[0]);
    const dialog = view.getByRole("dialog");
    const input = within(dialog).getByRole("textbox") as HTMLInputElement | HTMLTextAreaElement;
    await user.type(input, "Mi intención aceptada");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(input.matches(":disabled")).toBe(true);
    await user.type(input, " no aceptado");
    expect(input.value).toBe("Mi intención aceptada");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => pending.reject(new Error("offline")));
    await within(dialog).findByRole("alert");
    expect(input.matches(":disabled")).toBe(false);
    expect(input.value).toBe("Mi intención aceptada");
    await user.type(input, " revisada");
    save.mockResolvedValueOnce(snapshot);
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Mi intención aceptada revisada", type: "want_to_read" }));
  });

  it("opens the selected week after saving its month context without an unrelated draft warning", async () => {
    const user = userEvent.setup();
    const snapshot = createEmptySnapshot();
    const saveWeekPreparation = vi.fn(async () => snapshot);
    const planner = { snapshot, saveWeekPreparation } as unknown as PlannerController;
    const view = screenFor(<EditorialMonthMap planner={planner} access={access} year={2026} onYearChange={vi.fn()} onEdit={vi.fn()} onCreate={vi.fn()} onOpen={vi.fn()} />, "/app/planning");
    await user.click(view.getByRole("button", { name: /^octubre10/i }));
    await user.click(view.getByRole("button", { name: "Ver mi semana" }));
    const dialog = view.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /28 de septiembre/i }));
    await waitFor(() => expect(view.router.state.location.pathname + view.router.state.location.search).toBe("/app/guide?week=2026-09-28"));
    expect(saveWeekPreparation).toHaveBeenCalledTimes(1);
    expect(saveWeekPreparation).toHaveBeenCalledWith({ week: "2026-09-28", month: "2026-10" });
    expect(view.queryByRole("dialog", { name: "Tienes cambios sin guardar" })).toBeNull();
  });

  it("locks the review move date and other move controls while keeping the canonical task ID", async () => {
    const user = userEvent.setup();
    const pending = pendingSave();
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [{ id: "previous-task", title: "Pendiente anterior", date: "2026-09-23", priority: "medium", status: "planned", createdAt: "2026-09-23", updatedAt: "2026-09-23" }];
    const save = vi.fn(() => pending.promise);
    const planner = { snapshot, rescheduleTask: save } as unknown as PlannerController;
    const view = screenFor(<GuidePage planner={planner} />, "/app/guide?week=2026-09-28");
    await user.click(view.getAllByRole("button", { name: "Revisar semana anterior" })[0]);
    const dialog = view.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Mover" }));
    const input = within(dialog).getByLabelText("Fecha") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-10-02" } });
    expect(input.value).toBe("2026-10-02");
    await user.click(within(input.form!).getByRole("button", { name: "Mover" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("previous-task", "2026-10-02"));
    expect(input.matches(":disabled")).toBe(true);
    expect(within(dialog).getAllByRole("button", { name: "Mover" }).every((button) => button.matches(":disabled"))).toBe(true);
    await user.type(input, "2026-10-03");
    expect(input.value).toBe("2026-10-02");
    await act(async () => pending.reject(new Error("offline")));
    await within(dialog).findByRole("alert");
    expect(input.matches(":disabled")).toBe(false);
    expect(input.value).toBe("2026-10-02");
    save.mockResolvedValueOnce(snapshot);
    await user.click(within(input.form!).getByRole("button", { name: "Mover" }));
    await waitFor(() => expect(within(dialog).queryByLabelText("Fecha")).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("previous-task", "2026-10-02");
  });

  it("locks checklist checkboxes and custom text until preferences save, preserving both on failure", async () => {
    const user = userEvent.setup();
    const pending = pendingSave();
    const snapshot = createEmptySnapshot();
    const save = vi.fn(() => pending.promise);
    const planner = { snapshot, savePreparationPreferences: save } as unknown as PlannerController;
    const view = screenFor(<PreparationChecklist planner={planner} week="2026-09-28" />, "/app/guide");
    await user.click(view.getByRole("button", { name: "Personalizar checklist" }));
    const dialog = view.getByRole("dialog");
    const input = within(dialog).getByRole("textbox", { name: "Otro" }) as HTMLInputElement;
    const checkbox = within(dialog).getByRole("checkbox", { name: "Alimentación" }) as HTMLInputElement;
    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);
    await user.type(input, "Tiempo creativo");
    await user.click(within(dialog).getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expectLocked(input.form!);
    await user.click(checkbox); await user.type(input, " no aceptado");
    expect(checkbox.checked).toBe(false);
    expect(input.value).toBe("Tiempo creativo");
    await act(async () => pending.reject(new Error("offline")));
    await within(dialog).findByRole("alert");
    expect(input.matches(":disabled")).toBe(false);
    expect(checkbox.matches(":disabled")).toBe(false);
    expect(checkbox.checked).toBe(false);
    expect(input.value).toBe("Tiempo creativo");
    save.mockResolvedValueOnce(snapshot);
    await user.click(within(dialog).getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ label: "Tiempo creativo" })]));
    expect(save).toHaveBeenLastCalledWith(expect.not.arrayContaining([expect.objectContaining({ id: "nutrition" })]));
  });

  it.each([
    { kind: "meal", path: "nutrition", open: "Añadir comida", field: "Nombre", save: "Guardar comida", value: "Comida aceptada" },
    { kind: "workout", path: "training", open: "Añadir entrenamiento", field: "Nombre del entrenamiento", save: "Guardar entrenamiento", value: "Rutina aceptada" },
    { kind: "settings", path: "nutrition", open: "Configurar", field: "Meta física", save: "Guardar configuración", value: "Objetivo aceptado" },
  ])("locks every $kind field and restores editing on failure", async (example) => {
    const user = userEvent.setup();
    const pending = pendingSave();
    const save = vi.fn(() => pending.promise);
    const planner = { snapshot: createEmptySnapshot(), saveMeal: save, saveWorkoutPlan: save, updateProfileSettings: save } as unknown as PlannerController;
    const view = screenFor(<FitnessPage planner={planner} />, `/app/health?date=2026-10-02&section=${example.path}`);
    await user.click(view.getByRole("button", { name: example.open }));
    const dialog = view.getByRole("dialog");
    const input = within(dialog).getByRole("textbox", { name: example.field }) as HTMLInputElement;
    await user.clear(input); await user.type(input, example.value);
    await user.click(within(dialog).getByRole("button", { name: example.save }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expectLocked(input.form!);
    await user.type(input, " que no debe reemplazar el guardado");
    expect(input.value).toBe(example.value);
    await user.click(within(dialog).getByRole("button", { name: example.save }));
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => pending.reject(new Error("offline")));
    await view.findByRole("alert");
    expect(input.matches(":disabled")).toBe(false);
    expect(input.value).toBe(example.value);
    await user.type(input, " revisado");
    expect(input.value).toBe(example.value + " revisado");
  });

  it("locks health template destination, scope and title until persistence finishes", async () => {
    const user = userEvent.setup();
    const pending = pendingSave();
    const snapshot = createEmptySnapshot();
    snapshot.nutritionLogs = [{ id: "nutrition-real", date: "2026-10-01", createdAt: "now", updatedAt: "now", meals: [{ id: "meal-real", name: "Comida preparada", notes: "Detalle conservado" }] }];
    const save = vi.fn(() => pending.promise);
    const planner = { snapshot, saveHealthPreparation: save } as unknown as PlannerController;
    const view = screenFor(<HealthPlanning planner={planner} date="2026-10-02" section="nutrition" onSelectDate={vi.fn()} />);
    await user.click(view.getByRole("button", { name: "Biblioteca" }));
    await user.click(view.getByRole("button", { name: "Usar este contenido" }));
    const dialog = view.getByRole("dialog");
    const input = within(dialog).getByRole("textbox") as HTMLTextAreaElement;
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expectLocked(input.form!);
    await user.type(input, " no aceptado");
    expect(input.value).toBe("Comida preparada");
    await act(async () => pending.resolve(snapshot));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ sourceRecordId: "meal-real", date: "2026-10-02", title: "Comida preparada" }));
  });

  it("opening advanced goal options alone never creates a data draft", async () => {
    const user = userEvent.setup();
    const createGoal = vi.fn();
    const planner = { snapshot: createEmptySnapshot(), createGoal } as unknown as PlannerController;
    const view = screenFor(<GoalsPage planner={planner} access={access} />, "/app/goals");
    await user.click(view.getByRole("button", { name: "Crear meta" }));
    await user.click(view.getByRole("button", { name: /Cambiar método/ }));
    await user.click(view.getByRole("button", { name: "Cancelar" }));
    expect(view.queryByRole("dialog")).toBeNull();
    expect(createGoal).not.toHaveBeenCalled();
  });

  it("locks main goal fields and advanced controls during creation", async () => {
    const user = userEvent.setup();
    const pending = pendingSave();
    const save = vi.fn(() => pending.promise);
    const planner = { snapshot: createEmptySnapshot(), createGoal: save } as unknown as PlannerController;
    const view = screenFor(<GoalsPage planner={planner} access={access} />, "/app/goals");
    await user.click(view.getByRole("button", { name: "Crear meta" }));
    const dialog = view.getByRole("dialog");
    const input = within(dialog).getByRole("textbox", { name: "¿Qué quieres lograr?" }) as HTMLInputElement;
    await user.type(input, "Mi resultado aceptado");
    await user.type(view.getByRole("textbox", { name: "¿Por qué importa para ti?" }), "Porque importa");
    await user.click(view.getByRole("button", { name: /Cambiar método/ }));
    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expectLocked(input.form!);
    await user.type(input, " no aceptado");
    expect(input.value).toBe("Mi resultado aceptado");
    await act(async () => pending.resolve(goalSnapshot()));
    await view.findByText("Meta creada");
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ title: "Mi resultado aceptado" }), ["", ""]);
  });

  it("locks linked action fields and keeps the original ID on completion", async () => {
    const user = userEvent.setup();
    const pending = pendingSave();
    const snapshot = goalSnapshot();
    const save = vi.fn(() => pending.promise);
    const planner = { snapshot, updateTask: save } as unknown as PlannerController;
    const view = screenFor(<GoalsPage planner={planner} access={access} />, "/app/goals");
    await user.click(view.getByRole("button", { name: "Ver mi camino" }));
    await user.click(view.getByRole("button", { name: "Editar Paso existente" }));
    const dialog = view.getByRole("dialog");
    const input = within(dialog).getByRole("textbox", { name: "Acción" }) as HTMLInputElement;
    await user.clear(input); await user.type(input, "Paso aceptado");
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expectLocked(input.form!);
    await user.type(input, " no aceptado");
    expect(input.value).toBe("Paso aceptado");
    await act(async () => pending.resolve(snapshot));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(save).toHaveBeenCalledWith("task-real", expect.objectContaining({ title: "Paso aceptado", goalId: "goal-real" }));
  });
});
