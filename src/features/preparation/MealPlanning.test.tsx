// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import { applyPlannedMeal, type PlannedMealInput } from "@/src/domain/mealPlanning";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { MealDayCard, WeeklyMeals } from "./MealPlanning";

afterEach(cleanup);
const date = "2026-11-13";
const wrap = (element: React.ReactNode) => render(<I18nProvider><MemoryRouter>{element}</MemoryRouter></I18nProvider>);

describe("meal cards", () => {
  it("uses the configured week start and shows all main slots while keeping empty snacks optional in Mi día", () => {
    const snapshot = createEmptySnapshot();
    snapshot.profile = { weekStartsOn: 0 } as PlannerSnapshot["profile"];
    const planner = { snapshot } as PlannerController;
    const weekly = wrap(<WeeklyMeals planner={planner} date={date} onSelectDate={vi.fn()} />);
    expect(weekly.container.querySelectorAll(".meal-day-card")).toHaveLength(7);
    expect(weekly.container.querySelector(".meal-day-card")?.getAttribute("data-date")).toBe("2026-11-08");
    expect(weekly.getAllByRole("heading", { name: "Desayuno" })).toHaveLength(7);
    weekly.unmount();
    const daily = wrap(<MealDayCard planner={planner} date={date} daily />);
    expect(daily.getAllByText("Sin planificar")).toHaveLength(3);
    expect(daily.queryByText("Snacks")).toBeNull();
  });

  it("locks pending writes, rejects duplicate submits, preserves the failed draft and retries with the same identity", async () => {
    let reject!: (reason: Error) => void;
    const savePlannedMeal = vi.fn().mockImplementationOnce(() => new Promise((_, no) => { reject = no; })).mockResolvedValueOnce(createEmptySnapshot());
    const planner = { snapshot: createEmptySnapshot(), savePlannedMeal } as unknown as PlannerController;
    const view = wrap(<MealDayCard planner={planner} date={date} daily />);
    fireEvent.click(view.getByRole("button", { name: /Añadir Desayuno/ }));
    const input = view.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Huevos y pan" } });
    fireEvent.submit(input.form!); fireEvent.submit(input.form!);
    expect(savePlannedMeal).toHaveBeenCalledTimes(1);
    expect(input.closest("fieldset")?.disabled).toBe(true);
    expect(view.queryByRole("status")).toBeNull();
    await act(async () => reject(new Error("no space")));
    expect(view.getByRole("alert").textContent).toContain("Conservamos");
    expect(input.value).toBe("Huevos y pan");
    fireEvent.click(view.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("Plan guardado"));
    expect(savePlannedMeal.mock.calls[1][0]).toEqual(savePlannedMeal.mock.calls[0][0]);
  });

  it("shares content across week and day with independent dates and retains old unclassified meals", async () => {
    function Harness() {
      const [snapshot, setSnapshot] = useState(() => {
        const initial = createEmptySnapshot();
        initial.nutritionLogs = [{ id: "old-day", date, createdAt: "now", updatedAt: "now", meals: [{ id: "old", name: "Mi comida anterior" }] }];
        return initial;
      });
      const [selected, setSelected] = useState(date);
      const planner = { snapshot, savePlannedMeal: async (input: PlannedMealInput) => setSnapshot((current) => applyPlannedMeal(current, input, "now", () => "new-day")) } as unknown as PlannerController;
      return <><div data-testid="week"><WeeklyMeals planner={planner} date={selected} onSelectDate={setSelected} /></div><div data-testid="day"><MealDayCard planner={planner} date={date} daily /></div></>;
    }
    const view = wrap(<Harness />);
    const day = within(view.getByTestId("day"));
    expect(day.getByText("Mi comida anterior")).toBeTruthy();
    fireEvent.click(day.getByRole("button", { name: /Añadir Almuerzo/ }));
    fireEvent.change(day.getByRole("textbox"), { target: { value: "Arroz con pollo" } });
    fireEvent.click(day.getByRole("button", { name: "Guardar" }));
    const week = within(view.getByTestId("week"));
    await waitFor(() => expect(week.getByText("Arroz con pollo")).toBeTruthy());
    fireEvent.click(week.getByRole("button", { name: /Editar Almuerzo/ }));
    fireEvent.change(week.getByRole("textbox"), { target: { value: "Arroz con verduras" } });
    fireEvent.click(week.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(day.getByText("Arroz con verduras")).toBeTruthy());
    fireEvent.click(week.getByRole("button", { name: "Semana siguiente" }));
    expect(week.queryByText("Arroz con verduras")).toBeNull();
    expect(day.getByText("Arroz con verduras")).toBeTruthy();
  });
});
