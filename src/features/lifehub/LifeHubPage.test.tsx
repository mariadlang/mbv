// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { UnsavedDraftProvider } from "@/src/components/navigation/UnsavedDraftProvider";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { UserAccess } from "@/src/domain/access";
import { LifeHubPage } from "./LifeHubPage";

const calendar = vi.hoisted(() => ({ updateEvent: vi.fn(), createEvent: vi.fn(), snapshot: { calendars: [] }, events: [], connected: false, saving: false, error: null }));
vi.mock("@/src/hooks/useCalendarIntegration", () => ({ useCalendarIntegration: () => calendar }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
const access = { accessStatus: "free", role: "user" } as UserAccess;
function setup(path: string) {
  const snapshot = createEmptySnapshot();
  snapshot.events = [{ id: "original-event", title: "Revisión mensual", startDate: "2026-10-02", endDate: "2026-10-02", startTime: "09:00", endTime: "10:00", allDay: false, category: "work", status: "confirmed", createdAt: "2026-10-01", updatedAt: "2026-10-01" }];
  snapshot.routines = [{ id: "original-routine", name: "Pausa tranquila", period: "pm", scheduledDays: [1, 3, 5], steps: [{ id: "step-original", title: "Leer" }], status: "active", createdAt: "2026-10-01", updatedAt: "2026-10-01" }];
  snapshot.tasks = [{ id: "original-inbox", title: "Idea pendiente", priority: "medium", status: "inbox", createdAt: "2026-10-01", updatedAt: "2026-10-01" }];
  snapshot.brainDumpItems = [{ id: "original-idea", title: "Leer un libro", type: "want_to_read", priority: "medium", status: "idea", createdAt: "2026-10-01", updatedAt: "2026-10-01" }];
  const updateRoutine = vi.fn().mockResolvedValue(snapshot);
  const createRoutine = vi.fn().mockResolvedValue(snapshot);
  const updateTask = vi.fn().mockResolvedValue(snapshot);
  const updateBrainDumpItem = vi.fn().mockResolvedValue(snapshot);
  const scheduleBrainDumpItem = vi.fn().mockResolvedValue(snapshot);
  const createVisionBoardItem = vi.fn().mockResolvedValue(snapshot);
  const onQuickCapture = vi.fn();
  const planner = { snapshot, updateRoutine, createRoutine, updateTask, updateBrainDumpItem, scheduleBrainDumpItem, createVisionBoardItem } as unknown as PlannerController;
  const router = createMemoryRouter([{ path: "/app/life-hub", element: <UnsavedDraftProvider><LifeHubPage planner={planner} access={access} onQuickCapture={onQuickCapture} /></UnsavedDraftProvider> }], { initialEntries: ["/app/life-hub", path], initialIndex: 1 });
  const view = render(<I18nProvider><RouterProvider router={router} /></I18nProvider>);
  return { ...view, updateRoutine, createRoutine, updateTask, updateBrainDumpItem, scheduleBrainDumpItem, createVisionBoardItem, onQuickCapture, router };
}

describe("LifeHub saved editors", () => {
  it.each([
    ["?tab=calendar", "?tab=events", "", ""],
    ["?tab=calendar&event=original-event&date=2026-10-02#event-details", "?tab=events&event=original-event&date=2026-10-02", "#event-details", "Revisión mensual"],
  ])("replaces legacy calendar URL %s while preserving context and browser history", async (requested, canonical, hash, title) => {
    const view = setup(`/app/life-hub${requested}`);
    await waitFor(() => expect(view.router.state.location.search).toBe(canonical));
    expect(view.router.state.location.hash).toBe(hash);
    expect(view.getByRole("button", { name: "Calendario" }).getAttribute("aria-current")).toBe("page");
    expect((view.getByLabelText("Evento", { exact: true }) as HTMLInputElement).value).toBe(title);
    expect(calendar.updateEvent).not.toHaveBeenCalled();
    expect(calendar.createEvent).not.toHaveBeenCalled();
    await act(async () => { await view.router.navigate(-1); });
    expect(view.router.state.location.search).toBe("");
    expect(view.router.state.location.hash).toBe("");
    expect(view.getByRole("heading", { name: "Mi espacio" })).toBeTruthy();
  });

  it.each([
    ["event", "events&event=original-event", null, "Evento", "Revisión ajustada", "Guardar evento"],
    ["routine", "routines", "Editar Pausa tranquila", "Pasos · uno por línea", "Leer\nRespirar", "Guardar rutina"],
    ["inbox", "lists", "Organizar Idea pendiente", "Editar captura", "Idea ajustada", "Guardar"],
    ["item", "lists", "Editar Leer un libro", "Editar idea", "Lectura tranquila", "Guardar"],
    ["conversion", "lists", "Convertir Leer un libro en acción", "Destino", "weekly", "Confirmar destino"],
    ["vision", "vision", null, "Frase", "Una vida más mía", "Añadir al tablero de visión"],
  ] as const)("locks %s controls until a failed save settles and retains the submitted draft", async (kind, tab, opener, label, value, saveLabel) => {
    const view = setup(`/app/life-hub?tab=${tab}`);
    const operation = kind === "event" ? calendar.updateEvent : kind === "routine" ? view.updateRoutine : kind === "inbox" ? view.updateTask : kind === "item" ? view.updateBrainDumpItem : kind === "conversion" ? view.scheduleBrainDumpItem : view.createVisionBoardItem;
    let rejectSave!: (error: Error) => void;
    operation.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    if (opener) fireEvent.click(view.getByRole("button", { name: opener }));
    const field = view.getByLabelText(label, { exact: true }) as HTMLInputElement;
    fireEvent.change(field, { target: { value } });
    fireEvent.click(view.getByRole("button", { name: saveLabel }));
    await waitFor(() => expect(operation).toHaveBeenCalledTimes(1));
    const controls = Array.from(field.closest("form")!.querySelectorAll("input, textarea, select, button"));
    expect(controls.length).toBeGreaterThan(1);
    expect(controls.every((control) => control.matches(":disabled"))).toBe(true);
    expect(field.value).toBe(value);
    await act(async () => rejectSave(new Error("offline")));
    await waitFor(() => expect(field.matches(":disabled")).toBe(false));
    expect(field.value).toBe(value);
    expect(view.getByRole("alert").textContent).toContain("Conservamos");
  });

  it("locks a pending image read, ignores a second queued upload and saves only the loaded image", async () => {
    const readers: Array<{ result: string; onload: (() => void) | null; readAsDataURL: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal("FileReader", class {
      result = "data:image/png;base64,Zmlyc3Q=";
      onload: (() => void) | null = null;
      onerror = null;
      onabort = null;
      readAsDataURL = vi.fn();
      abort = vi.fn();
      constructor() { readers.push(this); }
    });
    const view = setup("/app/life-hub?tab=vision");
    const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    const first = new File(["first"], "first.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [first] } });
    const reader = readers[0];
    expect(input.disabled).toBe(true);
    expect((view.getByRole("textbox", { name: "Frase" }) as HTMLInputElement).disabled).toBe(true);
    expect(view.getByRole("button", { name: "Añadir al tablero de visión" }).matches(":disabled")).toBe(true);
    fireEvent.change(input, { target: { files: [new File(["second"], "second.png", { type: "image/png" })] } });
    expect(readers).toHaveLength(1);
    expect(reader.readAsDataURL).toHaveBeenCalledTimes(1);
    expect(reader.readAsDataURL).toHaveBeenCalledWith(first);
    expect(view.createVisionBoardItem).not.toHaveBeenCalled();
    await act(async () => reader.onload?.());
    expect(input.disabled).toBe(false);
    expect(view.container.querySelector(".vision-upload-preview img")?.getAttribute("src")).toBe(reader.result);
    fireEvent.click(view.getByRole("button", { name: "Añadir al tablero de visión" }));
    await waitFor(() => expect(view.createVisionBoardItem).toHaveBeenCalledWith(expect.objectContaining({ content: reader.result, type: "image" })));
  });

  it("cancels a pending image reader when the editor unmounts", async () => {
    const abort = vi.fn();
    let finishRead: (() => void) | null = null;
    vi.stubGlobal("FileReader", class {
      result = "data:image/png;base64,b2xk";
      onload: (() => void) | null = null;
      onerror = null;
      onabort = null;
      abort = abort;
      readAsDataURL() { finishRead = () => this.onload?.(); }
    });
    const view = setup("/app/life-hub?tab=vision");
    fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(["old"], "old.png", { type: "image/png" })] } });
    view.unmount();
    await act(async () => { finishRead?.(); });
    expect(abort).toHaveBeenCalledTimes(1);
    expect(view.createVisionBoardItem).not.toHaveBeenCalled();
  });

  it("opens the canonical calendar event from the agenda deep link and retains a failed edit", async () => {
    calendar.updateEvent.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const view = setup("/app/life-hub?tab=calendar&event=original-event&date=2026-10-02");
    const name = view.getByLabelText("Evento", { exact: true }) as HTMLInputElement;
    expect(name.value).toBe("Revisión mensual");
    fireEvent.change(name, { target: { value: "Revisión mensual ajustada" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar evento" }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect(name.value).toBe("Revisión mensual ajustada");
    fireEvent.click(view.getByRole("button", { name: "Guardar evento" }));
    await waitFor(() => expect(name.value).toBe(""));
    expect(calendar.updateEvent).toHaveBeenCalledTimes(2);
    expect(calendar.updateEvent).toHaveBeenLastCalledWith("original-event", expect.objectContaining({ title: "Revisión mensual ajustada", startDate: "2026-10-02" }));
    expect(calendar.createEvent).not.toHaveBeenCalled();
  });
  it("protects calendar changes when switching tools and can keep or discard the draft", async () => {
    const view = setup("/app/life-hub?tab=events&event=original-event");
    fireEvent.change(view.getByLabelText("Evento", { exact: true }), { target: { value: "Borrador sin perder" } });
    fireEvent.click(view.getByRole("button", { name: "Rutinas" }));
    await waitFor(() => expect(view.getByRole("dialog", { name: "Tienes cambios sin guardar" })).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: "Seguir editando" }));
    expect((view.getByLabelText("Evento", { exact: true }) as HTMLInputElement).value).toBe("Borrador sin perder");
    fireEvent.click(view.getByRole("button", { name: "Rutinas" }));
    fireEvent.click(view.getByRole("button", { name: "Descartar cambios" }));
    await waitFor(() => expect(view.router.state.location.search).toBe("?tab=routines"));
    expect(calendar.updateEvent).not.toHaveBeenCalled();
  });
  it("keeps routine details after failure and updates the same routine with its scheduled days", async () => {
    const view = setup("/app/life-hub?tab=routines");
    view.updateRoutine.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    fireEvent.click(view.getByRole("button", { name: "Editar Pausa tranquila" }));
    const steps = view.getByRole("textbox", { name: /Pasos/ }) as HTMLTextAreaElement;
    fireEvent.change(steps, { target: { value: "Leer\nDescansar" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar rutina" }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect(steps.value).toBe("Leer\nDescansar");
    fireEvent.click(view.getByRole("button", { name: "Guardar rutina" }));
    await waitFor(() => expect(steps.value).toBe(""));
    expect(view.updateRoutine).toHaveBeenLastCalledWith("original-routine", expect.objectContaining({ steps: ["Leer", "Descansar"], scheduledDays: [1, 3, 5] }));
    expect(view.createRoutine).not.toHaveBeenCalled();
  });
  it("protects list edits on filter changes, preserves failures and only discards explicitly", async () => {
    const view = setup("/app/life-hub?tab=lists");
    view.updateBrainDumpItem.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(view.getByRole("button", { name: "Editar Leer un libro" }));
    const input = view.getByRole("textbox", { name: "Editar idea" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Leer con calma" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect(input.value).toBe("Leer con calma");
    fireEvent.click(view.getByRole("button", { name: "Quiero leer" }));
    fireEvent.click(view.getByRole("button", { name: "Seguir editando" }));
    expect(input.value).toBe("Leer con calma");
    fireEvent.click(view.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(view.getByRole("button", { name: "Descartar cambios" }));
    await waitFor(() => expect(view.queryByRole("textbox", { name: "Editar idea" })).toBeNull());
    expect(view.updateBrainDumpItem).toHaveBeenCalledTimes(1);
    expect(view.updateBrainDumpItem).toHaveBeenCalledWith("original-idea", expect.objectContaining({ title: "Leer con calma" }));
  });
  it("saves the original inbox action before opening another editor and keeps it on failure", async () => {
    const view = setup("/app/life-hub?tab=lists");
    view.updateTask.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    fireEvent.click(view.getByRole("button", { name: "Organizar Idea pendiente" }));
    const input = view.getByRole("textbox", { name: "Editar captura" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Idea revisada" } });
    fireEvent.click(view.getByRole("button", { name: "Editar Leer un libro" }));
    fireEvent.click(view.getByRole("button", { name: "Guardar y continuar" }));
    await waitFor(() => expect(view.updateTask).toHaveBeenCalledTimes(1));
    expect(input.value).toBe("Idea revisada");
    expect(view.queryByRole("textbox", { name: "Editar idea" })).toBeNull();
    await waitFor(() => expect(view.getByRole("button", { name: "Guardar y continuar" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(view.getByRole("button", { name: "Guardar y continuar" }));
    await waitFor(() => expect(view.getByRole("textbox", { name: "Editar idea" })).toBeTruthy());
    expect(view.updateTask).toHaveBeenLastCalledWith("original-inbox", expect.objectContaining({ title: "Idea revisada" }));
    expect(view.updateTask).toHaveBeenCalledTimes(2);
  });
  it("guards conversion changes and retries the same source record", async () => {
    const view = setup("/app/life-hub?tab=lists");
    view.scheduleBrainDumpItem.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    fireEvent.click(view.getByRole("button", { name: "Convertir Leer un libro en acción" }));
    fireEvent.change(view.getByLabelText("Destino"), { target: { value: "weekly" } });
    fireEvent.click(view.getByRole("button", { name: "Confirmar destino" }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    fireEvent.click(view.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(view.getByRole("button", { name: "Seguir editando" }));
    expect((view.getByRole("combobox", { name: "Destino" }) as unknown as HTMLSelectElement).value).toBe("weekly");
    fireEvent.click(view.getByRole("button", { name: "Confirmar destino" }));
    await waitFor(() => expect(view.queryByLabelText("Destino")).toBeNull());
    expect(view.scheduleBrainDumpItem).toHaveBeenLastCalledWith("original-idea", expect.any(String), "weekly");
  });
  it("saves the vision draft before switching tools and preserves it after a failed save", async () => {
    const view = setup("/app/life-hub?tab=vision");
    view.createVisionBoardItem.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const input = view.getByRole("textbox", { name: "Frase" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Una vida más mía" } });
    fireEvent.click(view.getByRole("button", { name: "Añadir al tablero de visión" }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect(input.value).toBe("Una vida más mía");
    fireEvent.click(view.getByRole("button", { name: "Rutinas" }));
    fireEvent.click(view.getByRole("button", { name: "Seguir editando" }));
    expect(input.value).toBe("Una vida más mía");
    fireEvent.click(view.getByRole("button", { name: "Rutinas" }));
    fireEvent.click(view.getByRole("button", { name: "Guardar y continuar" }));
    await waitFor(() => expect(view.router.state.location.search).toBe("?tab=routines"));
    expect(view.createVisionBoardItem).toHaveBeenLastCalledWith(expect.objectContaining({ content: "Una vida más mía", type: "quote", reminderEnabled: false }));
    fireEvent.click(view.getByRole("button", { name: "Tablero de visión" }));
    expect((view.getByRole("textbox", { name: "Frase" }) as HTMLInputElement).value).toBe("");
    fireEvent.click(view.getByRole("button", { name: "Rutinas" }));
    expect(view.queryByRole("dialog")).toBeNull();
  });
  it("protects the vision draft on browser back and refresh until explicitly discarded", async () => {
    const view = setup("/app/life-hub?tab=vision");
    fireEvent.change(view.getByRole("textbox", { name: "Frase" }), { target: { value: "Sigo construyendo" } });
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    await act(async () => { await view.router.navigate(-1); });
    fireEvent.click(view.getByRole("button", { name: "Seguir editando" }));
    expect(view.router.state.location.search).toBe("?tab=vision");
    await act(async () => { await view.router.navigate(-1); });
    fireEvent.click(view.getByRole("button", { name: "Descartar cambios" }));
    await waitFor(() => expect(view.router.state.location.search).toBe(""));
    expect(view.createVisionBoardItem).not.toHaveBeenCalled();
  });
  it("asks before opening quick capture over an inbox draft", async () => {
    const view = setup("/app/life-hub?tab=lists");
    fireEvent.click(view.getByRole("button", { name: "Organizar Idea pendiente" }));
    fireEvent.change(view.getByRole("textbox", { name: "Editar captura" }), { target: { value: "Sin perder" } });
    fireEvent.click(view.getByRole("button", { name: "Captura rápida" }));
    expect(view.onQuickCapture).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("button", { name: "Descartar cambios" }));
    await waitFor(() => expect(view.onQuickCapture).toHaveBeenCalledWith({ source: "inbox" }));
    expect(view.updateTask).not.toHaveBeenCalled();
  });
});
