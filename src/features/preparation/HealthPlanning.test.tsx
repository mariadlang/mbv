// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { HealthPlanning } from "./HealthPlanning";

afterEach(cleanup);
describe("health preparation editor", () => {
  it("opens actual records, identifies incomplete entries and applies detailed source references only on save", async () => {
    const snapshot = createEmptySnapshot();
    snapshot.nutritionLogs = [{ id: "day", date: "2026-10-01", createdAt: "now", updatedAt: "now", meals: [{ id: "detailed", name: "Almuerzo guardado", notes: "Arroz 100 g", protein: 18, completed: true }, { id: "title-only", name: "Pendiente" }] }];
    const saveHealthPreparation = vi.fn().mockResolvedValue(snapshot);
    const onEditRecord = vi.fn();
    const planner = { snapshot, saveHealthPreparation } as unknown as PlannerController;
    const view = render(<I18nProvider><MemoryRouter><HealthPlanning planner={planner} date="2026-10-02" section="nutrition" onSelectDate={vi.fn()} onEditRecord={onEditRecord} /></MemoryRouter></I18nProvider>);
    fireEvent.click(view.getByRole("button", { name: /^Biblioteca$/ }));
    expect(view.getByText("Pendiente de completar: solo contiene un título")).toBeTruthy();
    expect(view.getAllByRole("button", { name: "Usar este contenido" })).toHaveLength(1);
    fireEvent.click(view.getAllByRole("button", { name: "Ver detalle" })[0]);
    expect(view.getByText("Arroz 100 g")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Abrir editor detallado" }));
    expect(onEditRecord).toHaveBeenCalledWith("2026-10-01", "detailed");
    fireEvent.click(view.getByRole("button", { name: "Usar este contenido" }));
    expect(saveHealthPreparation).not.toHaveBeenCalled();
    fireEvent.click(within(view.getByRole("dialog")).getByRole("button", { name: /^Guardar$/ }));
    await waitFor(() => expect(saveHealthPreparation).toHaveBeenCalledWith({ date: "2026-10-02", section: "nutrition", scope: "weekly", title: "Almuerzo guardado", sourceDate: "2026-10-01", sourceRecordId: "detailed" }));
  });
  it("retains the draft on save failure and retries without false success", async () => {
    const snapshot = createEmptySnapshot();
    const saveHealthPreparation = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(snapshot);
    const planner = { snapshot, saveHealthPreparation } as unknown as PlannerController;
    const view = render(<I18nProvider><MemoryRouter><HealthPlanning planner={planner} date="2026-10-02" section="nutrition" onSelectDate={vi.fn()} /></MemoryRouter></I18nProvider>);
    fireEvent.click(view.getByRole("button", { name: "Crear mi plan" }));
    fireEvent.change(view.getByRole("textbox"), { target: { value: "Mi comida preparada" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect((view.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Mi comida preparada");
    fireEvent.click(view.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(saveHealthPreparation).toHaveBeenCalledTimes(2);
  });
  it("does not save a proposal until it is explicitly accepted", () => {
    const saveHealthPreparation = vi.fn();
    const planner = { snapshot: createEmptySnapshot(), saveHealthPreparation } as unknown as PlannerController;
    const view = render(<I18nProvider><MemoryRouter><HealthPlanning planner={planner} date="2026-10-02" section="training" onSelectDate={vi.fn()} /></MemoryRouter></I18nProvider>);
    fireEvent.click(view.getByRole("button", { name: "Recibir una propuesta" }));
    expect(view.getByText(/Ayuda guiada manual, sin IA/)).toBeTruthy();
    expect(saveHealthPreparation).not.toHaveBeenCalled();
  });
});
